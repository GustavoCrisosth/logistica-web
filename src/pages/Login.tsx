import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:3333/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao fazer login');
            }

            loginAction(data.token, data.user);

            navigate('/dashboard');
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocorreu um erro inesperado.');
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">
                    Logística Real-Time
                </h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="admin@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Entrar no Sistema
                    </button>
                </form>
            </div>
        </div>
    );
}