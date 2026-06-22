import { Inter } from 'next/font/google'
import '@/app/globals.css'

// display:swap evita FOUT; preload reduz tempo de carregamento
const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600'],   // removido 700 — raro no sistema
    display: 'swap',
    preload: true,
})

export const metadata = {
    title: 'All Life',
    description: 'Gestão de tarefas, projetos, saúde e finanças',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        title: 'All Life',
        statusBarStyle: 'black-translucent',
    },
}

export const viewport = {
    themeColor: '#8B8BF9',
}

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR" className={inter.className}>
            <body className="bg-bg text-text-primary m-0 antialiased">
                {children}
            </body>
        </html>
    )
}
