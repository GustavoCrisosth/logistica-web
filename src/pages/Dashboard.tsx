import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io('http://localhost:3333');

export function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const [deliveryId, setDeliveryId] = useState('');
    const [isTracking, setIsTracking] = useState(false);

    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const defaultCenter = { lat: -1.2965, lng: -47.9254 };

    function handleLogout() {
        logout();
        navigate('/');
    }

    function startTracking() {
        if (!deliveryId) return alert('Digite o ID da entrega!');

        socket.emit('join_delivery', deliveryId);
        setIsTracking(true);
    }

    useEffect(() => {
        socket.on('new_location', (data: { lat: number; lng: number }) => {
            console.log('📍 Nova coordenada recebida:', data);
            setDriverLocation(data);
        });

        return () => {
            socket.off('new_location');
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-white shadow px-8 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Painel Logístico</h1>
                    <p className="text-slate-500 text-sm">Operador: {user?.name}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Sair do Sistema
                </button>
            </header>

            <main className="flex-1 p-8 flex gap-8">

                <aside className="w-80 bg-white rounded-xl shadow p-6 flex flex-col gap-4">
                    <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Rastreamento</h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ID da Entrega (UUID)</label>
                        <input
                            type="text"
                            value={deliveryId}
                            onChange={(e) => setDeliveryId(e.target.value)}
                            placeholder="Cole o ID aqui..."
                            className="w-full px-3 py-2 border rounded outline-none focus:border-blue-500 text-sm"
                        />
                    </div>

                    <button
                        onClick={startTracking}
                        disabled={isTracking}
                        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                    >
                        {isTracking ? 'Rastreando...' : 'Iniciar Rastreio'}
                    </button>

                    {driverLocation && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p className="font-semibold mb-1">Última Posição Registrada:</p>
                            <p>Lat: {driverLocation.lat.toFixed(5)}</p>
                            <p>Lng: {driverLocation.lng.toFixed(5)}</p>
                        </div>
                    )}
                </aside>

                <section className="flex-1 bg-white rounded-xl shadow overflow-hidden border-4 border-white relative">
                    <MapContainer
                        center={[defaultCenter.lat, defaultCenter.lng]}
                        zoom={14}
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {driverLocation && (
                            <Marker position={[driverLocation.lat, driverLocation.lng]}>
                                <Popup>
                                    O motorista está aqui!
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </section>

            </main>
        </div>
    );
}