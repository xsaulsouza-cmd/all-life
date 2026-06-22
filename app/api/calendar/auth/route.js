import { getAuthUrl } from '@/lib/googleAuth'

export async function GET() {
    const url = getAuthUrl()
    return Response.redirect(url)
}
