export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-bg-base/50 backdrop-blur-sm mt-auto relative z-10">
            <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">
                        &copy; 2026 Nexsight. Built on
                    </span>
                    <span className="text-sm font-bold bg-gradient-to-r from-accent-emerald to-accent-violet bg-clip-text text-transparent">
                        Solana
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="text-sm text-text-secondary hover:text-accent-emerald transition-colors">
                        Terms
                    </a>
                    <a href="#" className="text-sm text-text-secondary hover:text-accent-emerald transition-colors">
                        Privacy
                    </a>
                    <a href="#" className="text-sm text-text-secondary hover:text-accent-emerald transition-colors">
                        Discord
                    </a>
                    <a href="#" className="text-sm text-text-secondary hover:text-accent-emerald transition-colors">
                        Twitter
                    </a>
                </div>
            </div>
        </footer>
    );
}
