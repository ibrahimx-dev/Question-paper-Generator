import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wand2, Menu, X } from 'lucide-react';

const menuItems = [
    { name: 'Dashboard',      icon: LayoutDashboard, path: '/dashboard' },
];

export default function Layout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-100 flex-col lg:flex-row">

            {/* Mobile header / top bar */}
            <header className="lg:hidden bg-indigo-900 text-white h-16 flex items-center justify-between px-4 z-30 shadow-md flex-shrink-0">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 hover:bg-indigo-800 rounded-lg focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <span className="text-lg font-bold flex items-center gap-2">
                    <img src="/logo.jpg" alt="Logo" className="h-7 w-7 rounded-lg object-cover border border-indigo-800" />
                    AI Paper Gen
                </span>
                <div className="w-6"></div> {/* Spacer to balance centering */}
            </header>

            {/* Mobile backdrop overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
            )}

            {/* ── Sidebar ── */}
            <div
                className={`fixed inset-y-0 left-0 w-64 bg-indigo-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto lg:h-full
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo & Close button */}
                <div className="p-6 border-b border-indigo-800 flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-lg object-cover border border-indigo-800" />
                        AI Paper Gen
                    </h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 -mr-2 hover:bg-indigo-800 rounded-lg focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Close menu"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {menuItems.map((item) => {
                        const Icon     = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-indigo-600 text-white font-medium shadow-md'
                                        : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* ── Main content area ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-8 flex-shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-lg focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600"
                        aria-label="Open menu"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                        {menuItems.find(m => m.path === location.pathname)?.name || 'Dashboard'}
                    </h2>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
