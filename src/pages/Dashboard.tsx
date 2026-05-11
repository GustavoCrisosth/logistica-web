import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';

import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const DefaultIcon = L.icon({
    iconUrl,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const socket = io('http://localhost:3333');

interface Delivery {
    id: string;
    status?: string;
}

interface DeliveryLocationHistory {
    latitude: number;
    longitude: number;
}

interface DeliveryDetailResponse {
    history: DeliveryLocationHistory[];
}

export function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const [deliveryId, setDeliveryId] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [routeHistory, setRouteHistory] = useState<[number, number][]>([]);

    const defaultCenter = { lat: -1.2965, lng: -47.9254 };

    function handleLogout() {
        logout();
        navigate('/');
    }

    useEffect(() => {
        async function fetchDeliveries() {
            const token = useAuthStore.getState().token;
            try {
                const response = await fetch('http://localhost:3333/deliveries', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();
                console.log("O que veio do banco:", data);

                if (response.ok && Array.isArray(data.deliveries)) {
                    setDeliveries(data.deliveries);
                } else {
                    setDeliveries([]);
                    toast.error(data.error || 'Nenhuma entrega encontrada.');
                }
            } catch (error) {
                setDeliveries([]);
                toast.error('Erro ao conectar com o servidor.');
                console.error("Erro no fetch:", error);
            }
        }
        fetchDeliveries();
    }, []);

    useEffect(() => {
        socket.on('new_location', (data: { lat: number; lng: number }) => {
            setDriverLocation(data);
            setRouteHistory((prevHistory) => [...prevHistory, [data.lat, data.lng]]);
        });

        return () => {
            socket.off('new_location');
        };
    }, []);

    async function trackDelivery(id: string) {
        setDeliveryId(id);
        setIsTracking(true);

        const token = useAuthStore.getState().token;

        try {
            const response = await fetch(`http://localhost:3333/deliveries/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data: DeliveryDetailResponse = await response.json();

            const history: [number, number][] = data.history?.map((loc) => [
                loc.latitude,
                loc.longitude
            ]) || [];

            setRouteHistory(history);

            if (history && history.length > 0) {
                const lastPoint = history[history.length - 1];
                if (lastPoint[0] && lastPoint[1]) {
                    setDriverLocation({ lat: lastPoint[0], lng: lastPoint[1] });
                }
            } else {
                setDriverLocation(null);
            }
        } catch (err) {
            console.error(err);
            toast.error("Não foi possível carregar o histórico da rota.");
        }

        socket.emit('join_delivery', id);
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-white shadow px-8 py-4 flex justify-between items-center z-10">
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
                <aside className="w-96 bg-white rounded-xl shadow p-6 flex flex-col gap-4 overflow-hidden">
                    <h2 className="font-semibold text-lg text-slate-800 border-b pb-2">Entregas Ativas</h2>

                    <div className="flex-1 overflow-y-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID (UUID)</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(!deliveries || deliveries.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                                            Nenhuma entrega disponível.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    deliveries.map((delivery) => (
                                        <TableRow key={delivery.id}>
                                            <TableCell className="font-mono text-xs">
                                                {delivery.id?.substring(0, 8)}...
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <button
                                                    onClick={() => trackDelivery(delivery.id)}
                                                    className={`text-xs px-3 py-1 rounded font-medium transition-colors ${deliveryId === delivery.id
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                        }`}
                                                >
                                                    {deliveryId === delivery.id ? 'Ativo' : 'Rastrear'}
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {driverLocation && typeof driverLocation.lat === 'number' && (
                        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p className="font-semibold">Última Posição:</p>
                            <p>
                                Lat: {driverLocation.lat?.toFixed(5)} | Lng: {driverLocation.lng?.toFixed(5)}
                            </p>
                        </div>
                    )}
                </aside>

                <section className="flex-1 bg-white rounded-xl shadow overflow-hidden border-4 border-white relative">
                    <MapContainer
                        center={[defaultCenter.lat, defaultCenter.lng]}
                        zoom={14}
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {driverLocation && !isNaN(driverLocation.lat) && !isNaN(driverLocation.lng) && (
                            <Marker position={[driverLocation.lat, driverLocation.lng]}>
                                <Popup>Motorista em trânsito</Popup>
                            </Marker>
                        )}

                        {routeHistory.length > 1 && (
                            <Polyline
                                positions={routeHistory.filter(p => p[0] != null && p[1] != null)}
                                color="#2563eb"
                                weight={5}
                            />
                        )}
                    </MapContainer>
                </section>
            </main>
        </div>
    );
}