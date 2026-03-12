import Pusher from 'pusher'

const appId = process.env.PUSHER_APP_ID || ''
const key = process.env.PUSHER_KEY || ''
const secret = process.env.PUSHER_SECRET || ''
const cluster = process.env.PUSHER_CLUSTER || ''

if (!appId || !key || !secret || !cluster) {
  console.warn('Pusher environment variables are incomplete')
}

// Check for brackets [] which might have been accidentally included
const hasBrackets = (s: string) => s.startsWith('[') && s.endsWith(']')

if (hasBrackets(appId) || hasBrackets(key) || hasBrackets(secret) || hasBrackets(cluster)) {
  console.error('Pusher environment variables contain brackets []. Please remove them from .env and Vercel settings.')
}

export const pusherServer = new Pusher({
  appId: appId.replace(/^\[(.+)\]$/, '$1'),
  key: key.replace(/^\[(.+)\]$/, '$1'),
  secret: secret.replace(/^\[(.+)\]$/, '$1'),
  cluster: cluster.replace(/^\[(.+)\]$/, '$1'),
  useTLS: true,
})
