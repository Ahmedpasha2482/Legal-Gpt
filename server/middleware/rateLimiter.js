const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  general: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60, // Per 15 minutes
    blockDuration: 60, // Block for 1 minute if limit exceeded
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 5, // 5 attempts
    duration: 15 * 60, // Per 15 minutes
    blockDuration: 15 * 60, // Block for 15 minutes
  }),

  // Query endpoints (moderate)
  query: new RateLimiterMemory({
    keyGenerator: (req) => req.user?.id || req.ip,
    points: 30, // 30 queries
    duration: 60 * 60, // Per hour
    blockDuration: 5 * 60, // Block for 5 minutes
  }),

  // File upload endpoints (strict)
  upload: new RateLimiterMemory({
    keyGenerator: (req) => req.user?.id || req.ip,
    points: 5, // 5 uploads
    duration: 60 * 60, // Per hour
    blockDuration: 30 * 60, // Block for 30 minutes
  })
};

const createRateLimiter = (limiterType = 'general') => {
  return async (req, res, next) => {
    try {
      const rateLimiter = rateLimiters[limiterType];
      
      if (!rateLimiter) {
        console.warn(`Rate limiter type '${limiterType}' not found, using general`);
        rateLimiter = rateLimiters.general;
      }

      await rateLimiter.consume(req.ip);
      
      // Add rate limit headers
      const resRateLimiter = await rateLimiter.get(req.ip);
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': rateLimiter.points,
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints || 0,
          'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext),
        });
      }

      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.set({
        'Retry-After': secs,
        'X-RateLimit-Limit': rateLimiters[limiterType].points,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext),
      });

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: secs
      });
    }
  };
};

// Specific middleware functions
const generalRateLimit = createRateLimiter('general');
const authRateLimit = createRateLimiter('auth');
const queryRateLimit = createRateLimiter('query');
const uploadRateLimit = createRateLimiter('upload');

module.exports = {
  createRateLimiter,
  generalRateLimit,
  authRateLimit,
  queryRateLimit,
  uploadRateLimit
};

// Export default rate limiter
module.exports = generalRateLimit;