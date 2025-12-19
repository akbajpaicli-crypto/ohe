// --- Existing Haversine and GridIndex logic remains the same ---
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000.0
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlambda = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

class GridIndex {
  private grid: Map<string, Array<{ idx: number; lat: number; lon: number }>>
  private gridDeg: number
  constructor(gridDeg = 0.001) {
    this.grid = new Map()
    this.gridDeg = gridDeg
  }
  private cell(lat: number, lon: number): string {
    const cx = Math.floor(lat / this.gridDeg); const cy = Math.floor(lon / this.gridDeg)
    return `${cx},${cy}`
  }
  insert(idx: number, lat: number, lon: number) {
    const key = this.cell(lat, lon)
    if (!this.grid.has(key)) this.grid.set(key, [])
    this.grid.get(key)!.push({ idx, lat, lon })
  }
  query(lat: number, lon: number): Array<{ idx: number; lat: number; lon: number }> {
    const cx = Math.floor(lat / this.gridDeg); const cy = Math.floor(lon / this.gridDeg)
    const candidates: Array<{ idx: number; lat: number; lon: number }> = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`
        if (this.grid.has(key)) candidates.push(...this.grid.get(key)!)
      }
    }
    return candidates
  }
}

// --- Augmented Interfaces ---

export interface AnalysisResult {
  asset_name: string
  asset_type: 'OHE' | 'Signal'
  latitude: number
  longitude: number
  logging_time: string
  speed_kmph: number | null
  matched: boolean
  distance_m?: number // Added to see how close the match was
}

export interface AnalysisSummary {
  total_assets: number
  matched_ohe: number
  matched_signals: number
  avg_speed: number
  max_speed: number
}

// --- Core Analysis Function ---

export async function analyzeData(
  rtisFile: File,
  oheFile: File,
  signalFile: File, // New file input
  maxDistance: number,
): Promise<{ summary: AnalysisSummary; results: AnalysisResult[] }> {
  const rtisContent = await rtisFile.text()
  const oheContent = await oheFile.text()
  const sigContent = await signalFile.text()

  const rtisData = parseCSV(rtisContent)
  const oheData = parseCSV(oheContent)
  const sigData = parseCSV(sigContent)

  // Column Mapping
  const rtisLat = findColumn(rtisData, ["Latitude", "lat"])
  const rtisLon = findColumn(rtisData, ["Longitude", "lon"])
  const rtisTime = findColumn(rtisData, ["Logging Time", "timestamp"])
  const rtisSpeed = findColumn(rtisData, ["Speed", "speed_kmph"])

  const oheLabel = findColumn(oheData, ["OHEMas", "OHE", "pole"]) || "OHEMas"
  const sigLabel = findColumn(sigData, ["SIGNAL", "SignalName", "Signal"]) || "SIGNAL"

  // 1. Build Index for RTIS
  const gridIndex = new GridIndex(0.001)
  rtisData.forEach((row, idx) => {
    const lat = Number.parseFloat(row[rtisLat!])
    const lon = Number.parseFloat(row[rtisLon!])
    if (!isNaN(lat) && !isNaN(lon)) gridIndex.insert(idx, lat, lon)
  })

  const results: AnalysisResult[] = []
  let oheMatches = 0
  let sigMatches = 0
  let totalSpeed = 0
  let speedCount = 0
  let maxSpeed = 0

  // 2. Helper for Matching Logic
  const performMatch = (assetRow: any, latKey: string, lonKey: string, labelKey: string, type: 'OHE' | 'Signal') => {
    const lat = Number.parseFloat(assetRow[latKey])
    const lon = Number.parseFloat(assetRow[lonKey])
    if (isNaN(lat) || isNaN(lon)) return

    const candidates = gridIndex.query(lat, lon)
    let bestIdx: number | null = null
    let bestDist = Number.POSITIVE_INFINITY

    candidates.forEach(({ idx, lat: rLat, lon: rLon }) => {
      const dist = haversineMeters(lat, lon, rLat, rLon)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = idx
      }
    })

    if (bestIdx !== null && bestDist <= maxDistance) {
      const rRow = rtisData[bestIdx]
      const speed = Number.parseFloat(rRow[rtisSpeed!])
      
      if (type === 'OHE') oheMatches++ 
      else sigMatches++

      if (!isNaN(speed)) {
        totalSpeed += speed; speedCount++; maxSpeed = Math.max(maxSpeed, speed)
      }

      results.push({
        asset_name: assetRow[labelKey] || "Unknown",
        asset_type: type,
        latitude: lat,
        longitude: lon,
        logging_time: rRow[rtisTime!] || "",
        speed_kmph: !isNaN(speed) ? speed : null,
        matched: true,
        distance_m: Math.round(bestDist)
      })
    } else {
      results.push({
        asset_name: assetRow[labelKey] || "Unknown",
        asset_type: type,
        latitude: lat,
        longitude: lon,
        logging_time: "",
        speed_kmph: null,
        matched: false
      })
    }
  }

  // 3. Process both asset types
  oheData.forEach(row => performMatch(row, findColumn(oheData, ["lat", "latitude"])!, findColumn(oheData, ["lon", "longitude"])!, oheLabel, 'OHE'))
  sigData.forEach(row => performMatch(row, findColumn(sigData, ["lat", "latitude"])!, findColumn(sigData, ["lon", "longitude"])!, sigLabel, 'Signal'))

  return {
    summary: {
      total_assets: results.length,
      matched_ohe: oheMatches,
      matched_signals: sigMatches,
      avg_speed: speedCount > 0 ? totalSpeed / speedCount : 0,
      max_speed: maxSpeed
    },
    results
  }
}

/**
 * Generates and triggers a download for the analysis report
 */
export function downloadReport(results: AnalysisResult[]) {
  const headers = ["Asset Name", "Type", "Status", "Logging Time", "Speed (km/h)", "Match Distance (m)", "Lat", "Lon"]
  const rows = results.map(r => [
    r.asset_name,
    r.asset_type,
    r.matched ? "Matched" : "Unmatched",
    r.logging_time,
    r.speed_kmph ?? "N/A",
    r.distance_m ?? "N/A",
    r.latitude,
    r.longitude
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n")

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `Railway_Analysis_Report_${new Date().toISOString().slice(0,10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// --- Utility functions (parseCSV, findColumn) from your snippet remain here ---
