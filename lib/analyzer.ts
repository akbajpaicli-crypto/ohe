// Haversine distance calculation

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



// Grid index for spatial queries

class GridIndex {

  private grid: Map<string, Array<{ idx: number; lat: number; lon: number }>>

  private gridDeg: number



  constructor(gridDeg = 0.001) {

    this.grid = new Map()

    this.gridDeg = gridDeg

  }



  private cell(lat: number, lon: number): string {

    const cx = Math.floor(lat / this.gridDeg)

    const cy = Math.floor(lon / this.gridDeg)

    return `${cx},${cy}`

  }



  insert(idx: number, lat: number, lon: number) {

    const key = this.cell(lat, lon)

    if (!this.grid.has(key)) {

      this.grid.set(key, [])

    }

    this.grid.get(key)!.push({ idx, lat, lon })

  }



  query(lat: number, lon: number): Array<{ idx: number; lat: number; lon: number }> {

    const cx = Math.floor(lat / this.gridDeg)

    const cy = Math.floor(lon / this.gridDeg)

    const candidates: Array<{ idx: number; lat: number; lon: number }> = []



    for (let dx = -1; dx <= 1; dx++) {

      for (let dy = -1; dy <= 1; dy++) {

        const key = `${cx + dx},${cy + dy}`

        if (this.grid.has(key)) {

          candidates.push(...this.grid.get(key)!)

        }

      }

    }



    return candidates

  }

}



// Parse CSV

function parseCSV(content: string): Array<Record<string, string>> {

  const lines = content.split("\n").filter((line) => line.trim())

  if (lines.length < 2) return []



  const headers = lines[0].split(",").map((h) => h.trim())

  const data: Array<Record<string, string>> = []



  for (let i = 1; i < lines.length; i++) {

    const values = lines[i].split(",").map((v) => v.trim())

    const row: Record<string, string> = {}

    headers.forEach((header, index) => {

      row[header] = values[index] || ""

    })

    data.push(row)

  }



  return data

}



// Find column by possible names

function findColumn(data: Array<Record<string, string>>, names: string[]): string | null {

  if (data.length === 0) return null

  const headers = Object.keys(data[0])

  for (const name of names) {

    const found = headers.find((h) => h.toLowerCase() === name.toLowerCase())

    if (found) return found

  }

  return null

}



export interface AnalysisResult {

  OHEMas: string

  latitude: number

  longitude: number

  logging_time: string

  speed_kmph: number | null

  matched: boolean

}



export interface AnalysisSummary {

  total_ohe_structures: number

  matched_structures: number

  unmatched_structures: number

  match_rate: number

  avg_speed: number

  max_speed: number

  min_speed: number

}



export async function analyzeData(

  rtisFile: File,

  oheFile: File,

  maxDistance: number,

): Promise<{ summary: AnalysisSummary; results: AnalysisResult[] }> {

  // Read file contents

  const rtisContent = await rtisFile.text()

  const oheContent = await oheFile.text()



  // Parse CSV files

  const rtisData = parseCSV(rtisContent)

  const oheData = parseCSV(oheContent)



  // Find columns

  const rtisLat = findColumn(rtisData, ["Latitude", "latitude", "lat"])

  const rtisLon = findColumn(rtisData, ["Longitude", "longitude", "lon"])

  const rtisTime = findColumn(rtisData, ["Logging Time", "LoggingTime", "timestamp"])

  const rtisSpeed = findColumn(rtisData, ["Speed", "speed", "speed_kmph"])



  const oheLat = findColumn(oheData, ["Latitude", "latitude", "lat"])

  const oheLon = findColumn(oheData, ["Longitude", "longitude", "lon"])

  const oheLabel = findColumn(oheData, ["OHEMas", "OHE", "pole", "pole_label"]) || "OHEMas"



  if (!rtisLat || !rtisLon || !oheLat || !oheLon) {

    throw new Error("Required latitude/longitude columns not found in one or both files")

  }



  // Build grid index for RTIS data

  const gridIndex = new GridIndex(0.001)



  rtisData.forEach((row, idx) => {

    try {

      const lat = Number.parseFloat(row[rtisLat])

      const lon = Number.parseFloat(row[rtisLon])

      if (!isNaN(lat) && !isNaN(lon)) {

        gridIndex.insert(idx, lat, lon)

      }

    } catch (e) {

      // Skip invalid rows

    }

  })



  // Match OHE structures to RTIS points

  const results: AnalysisResult[] = []

  let matchedCount = 0

  let totalSpeed = 0

  let speedCount = 0

  let maxSpeed = 0

  let minSpeed = Number.POSITIVE_INFINITY



  oheData.forEach((oheRow) => {

    try {

      const lat = Number.parseFloat(oheRow[oheLat])

      const lon = Number.parseFloat(oheRow[oheLon])



      if (isNaN(lat) || isNaN(lon)) return



      const candidates = gridIndex.query(lat, lon)

      let bestIdx: number | null = null

      let bestDist = Number.POSITIVE_INFINITY



      candidates.forEach(({ idx, lat: rtisLat, lon: rtisLon }) => {

        const dist = haversineMeters(lat, lon, rtisLat, rtisLon)

        if (dist < bestDist) {

          bestDist = dist

          bestIdx = idx

        }

      })



      if (bestIdx !== null && bestDist <= maxDistance) {

        const rtisRow = rtisData[bestIdx]

        const speed = rtisSpeed ? Number.parseFloat(rtisRow[rtisSpeed]) : null

        const time = rtisTime ? rtisRow[rtisTime] : ""



        results.push({

          OHEMas: oheRow[oheLabel] || "",

          latitude: lat,

          longitude: lon,

          logging_time: time,

          speed_kmph: !isNaN(speed!) ? speed : null,

          matched: true,

        })



        matchedCount++

        if (speed !== null && !isNaN(speed)) {

          totalSpeed += speed

          speedCount++

          maxSpeed = Math.max(maxSpeed, speed)

          minSpeed = Math.min(minSpeed, speed)

        }

      } else {

        results.push({

          OHEMas: oheRow[oheLabel] || "",

          latitude: lat,

          longitude: lon,

          logging_time: "",

          speed_kmph: null,

          matched: false,

        })

      }

    } catch (e) {

      console.error("Error processing OHE row:", e)

    }

  })



  const summary: AnalysisSummary = {

    total_ohe_structures: results.length,

    matched_structures: matchedCount,

    unmatched_structures: results.length - matchedCount,

    match_rate: results.length > 0 ? (matchedCount / results.length) * 100 : 0,

    avg_speed: speedCount > 0 ? totalSpeed / speedCount : 0,

    max_speed: maxSpeed === 0 ? 0 : maxSpeed,

    min_speed: minSpeed === Number.POSITIVE_INFINITY ? 0 : minSpeed,

  }



  return { summary, results }

}
