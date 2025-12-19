"use client"

import { useEffect, useRef } from "react"

interface MapContainerProps {
  data: Array<{
    OHEMas: string
    latitude: number
    longitude: number
    speed_kmph: number | null
    matched: boolean
  }>
}

export function MapContainer({ data }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const loadMap = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Leaflet"))
          document.head.appendChild(script)
        })
      }

      const L = (window as any).L
      if (!mapRef.current || mapInstanceRef.current) return

      // Calculate center point
      const lats = data.map((d) => d.latitude)
      const lons = data.map((d) => d.longitude)
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2
      const centerLon = (Math.max(...lons) + Math.min(...lons)) / 2

      // Initialize map
      const map = L.map(mapRef.current).setView([centerLat, centerLon], 12)
      mapInstanceRef.current = map

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      // Create custom icons
      const matchedIcon = L.divIcon({
        html: '<div style="background: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
        className: "custom-marker",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      const unmatchedIcon = L.divIcon({
        html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
        className: "custom-marker",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      // Add markers
      data.forEach((point) => {
        const marker = L.marker([point.latitude, point.longitude], {
          icon: point.matched ? matchedIcon : unmatchedIcon,
        }).addTo(map)

        const popupContent = `
          <div style="font-family: system-ui; font-size: 12px;">
            <strong>${point.OHEMas}</strong><br/>
            Speed: ${point.speed_kmph ? `${point.speed_kmph.toFixed(1)} km/h` : "N/A"}<br/>
            Status: ${point.matched ? "Matched" : "Unmatched"}
          </div>
        `
        marker.bindPopup(popupContent)
      })

      // Fit bounds to show all markers
      const bounds = L.latLngBounds(data.map((d) => [d.latitude, d.longitude]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    loadMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [data])

  return (
    <div className="relative h-[500px] w-full bg-muted">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
