// ─── Rate Limiting Simples por IP ────────────────────────────────────────────
//
// Sistema em memória de rate limiting. Rastreia requisições por IP.
// NOTA: Em produção com múltiplas instâncias, usar Redis ou Upstash é recomendado.

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Store em memória: IP → { count, resetAt }
const limiter = new Map<string, RateLimitEntry>()

// Limpar entradas expiradas a cada 60 segundos
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of limiter.entries()) {
    if (entry.resetAt < now) {
      limiter.delete(ip)
    }
  }
}, 60_000)

export interface RateLimitConfig {
  maxRequests: number // Número máximo de requisições
  windowMs: number    // Janela de tempo em ms
}

/**
 * Verifica se o IP está dentro do limite de taxa.
 * Retorna { allowed: true } se permitido, { allowed: false, retryAfter: number } caso contrário.
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): {
  allowed: boolean
  retryAfter?: number
} {
  const now = Date.now()
  const entry = limiter.get(ip)

  // Primeira requisição ou janela expirada
  if (!entry || entry.resetAt < now) {
    limiter.set(ip, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  // Dentro da janela: incrementa contador
  entry.count++

  if (entry.count > config.maxRequests) {
    // Excedido: calcula tempo até reset (em segundos)
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

/**
 * Extrai o IP real da requisição, considerando proxies.
 */
export function getClientIp(request: Request): string {
  // Headers de proxy
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // "203.0.113.195, 70.41.3.18, 150.172.238.178" → pega o primeiro
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // Fallback (não ideal fora de produção)
  return 'unknown'
}
