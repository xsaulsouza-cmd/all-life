import { isConnected } from '@/lib/googleAuth'

export async function GET() {
    try {
        const connected = await isConnected()
        return Response.json({ connected })
    } catch {
        return Response.json({ connected: false })
    }
}
