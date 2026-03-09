import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Default Vite-safe icons
import iconUrl from "leaflet/dist/images/marker-icon.png";
import icon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Custom start & end icons
const startIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // green pin
  iconSize: [32, 32],
});

const endIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149059.png", // red pin
  iconSize: [32, 32],
});

// Shop icon with numbers dynamically
const shopIcon = (number) =>
  new L.DivIcon({
    className: "shop-label-icon",
    html: `
      <div style="
        background: orange;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0px 0px 4px rgba(0,0,0,0.4);
      ">
        ${number}
      </div>
    `,
    iconSize: [28, 28],
  });

// Fix default marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2xUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Resize fix
const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, []);
  return null;
};

// Fit bounds to route + shops
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points);
    }
  }, [points]);
  return null;
};

// Haversine Distance Calculator
const calculateDistanceKm = (coords) => {
  let total = 0;
  const R = 6371; // earth radius

  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }

  return total.toFixed(2);
};

const TrackMap = ({ route, onClose }) => {
  if (!route?.path?.coordinates || route.path.coordinates.length === 0) {
    return <div className="text-red-500 text-center mt-4">No route found</div>;
  }

  // Convert GeoJSON coords
  const routeCoords = route.path.coordinates.map((c) => [c[1], c[0]]);
  const shopCoords = route.shops?.map((s) => [s.lat, s.lng]) || [];

  const totalDistance = calculateDistanceKm(routeCoords);

  // Combine all points for auto fit
  const allPoints = [...routeCoords, ...shopCoords];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div className="text-lg font-bold mb-3">
        🚶 Distance Travelled:{" "}
        <span className="text-blue-600">{totalDistance} km</span>
      </div>

      <div className="relative w-full h-full">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 w-6 right-5 z-9999 bg-red-600 text-white px-3 py-1 rounded-lg shadow-md hover:bg-red-700"
        >
          X
        </button>

        <MapContainer
          center={routeCoords[0]}
          zoom={17}
          scrollWheelZoom={true}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <ResizeMap />
          <FitBounds points={allPoints} />

          {/* Polyline Route */}
          <Polyline positions={routeCoords} color="blue" weight={6} />

          {/* Start Marker */}
          <Marker position={routeCoords[0]} icon={startIcon}>
            <Popup>
              <b>Start Location</b>
              <br />
              {new Date(route.startedAt).toLocaleString()}
            </Popup>
          </Marker>

          {/* End Marker */}
          <Marker position={routeCoords[routeCoords.length - 1]} icon={endIcon}>
            <Popup>
              <b>End Location</b>
              <br />
              {new Date(route.endedAt).toLocaleString()}
            </Popup>
          </Marker>

          {/* Shop Markers with Number Labels */}
          {route.shops?.map((shop, index) => (
            <Marker
              key={shop._id}
              position={[shop.lat, shop.lng]}
              icon={shopIcon(index + 1)}
            >
              <Popup>
                <b>Shop #{index + 1}</b> <br />
                Orders: {shop.order?.length} <br />
                Total: ₹{shop.grandTotal}
                <br />
                Reached: {new Date(shop.createdAt).toLocaleString()}
                <br />
                <img
                  src={shop.imageUrl}
                  style={{
                    width: "100%",
                    height: "100px",
                    marginTop: "5px",
                    borderRadius: "6px",
                    objectFit: "cover",
                  }}
                />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default TrackMap;
