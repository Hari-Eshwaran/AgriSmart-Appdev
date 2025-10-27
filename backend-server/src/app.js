const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const routes = require('./routes/index');
const paymentMaintenance = require('./utils/paymentMaintenance');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
console.log('Environment variables loaded:', { PORT: process.env.PORT, MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET' });

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection (optional for testing)
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    })
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        global.dbConnected = true;
    })
    .catch(err => {
        console.warn('⚠️  MongoDB connection failed (continuing with mock data):', err.message);
        global.dbConnected = false;
    });
} else {
    console.warn('⚠️  No MONGODB_URI provided (running with mock data only)');
    global.dbConnected = false;
}

// Routes
app.use('/api', routes);

// API Documentation endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AgriSmart Backend API',
        version: '1.0.0',
        status: 'Running',
        endpoints: {
            health: {
                method: 'GET',
                url: '/health',
                description: 'Health check endpoint'
            },
            auth: {
                register: {
                    method: 'POST',
                    url: '/api/auth/register',
                    description: 'User registration',
                    body: '{ name, email, password, role? }'
                },
                login: {
                    method: 'POST',
                    url: '/api/auth/login',
                    description: 'User login',
                    body: '{ email, password }'
                },
                me: {
                    method: 'GET',
                    url: '/api/auth/me',
                    description: 'Get current user info',
                    headers: { Authorization: 'Bearer <token>' }
                },
                logout: {
                    method: 'POST',
                    url: '/api/auth/logout',
                    description: 'User logout'
                },
                refreshToken: {
                    method: 'POST',
                    url: '/api/auth/refresh-token',
                    description: 'Refresh access token',
                    body: '{ refreshToken }'
                },
                roles: {
                    method: 'GET',
                    url: '/api/auth/roles',
                    description: 'Get available roles'
                }
            },
            weather: {
                current: {
                    method: 'GET',
                    url: '/api/weather/current?city={city}&lat={lat}&lon={lon}',
                    description: 'Get current weather data'
                },
                forecast: {
                    method: 'GET',
                    url: '/api/weather/forecast?city={city}&days={days}',
                    description: 'Get weather forecast'
                },
                alerts: {
                    method: 'GET',
                    url: '/api/weather/alerts?city={city}',
                    description: 'Get weather alerts'
                }
            },
            market: {
                prices: {
                    method: 'GET',
                    url: '/api/market/prices?commodity={commodity}&state={state}&limit={limit}',
                    description: 'Get market prices'
                },
                pricesByCommodity: {
                    method: 'GET',
                    url: '/api/market/prices/{commodity}?state={state}&limit={limit}',
                    description: 'Get prices for specific commodity'
                },
                trends: {
                    method: 'GET',
                    url: '/api/market/trends?commodity={commodity}&period={period}',
                    description: 'Get market trends'
                },
                analysis: {
                    method: 'GET',
                    url: '/api/market/analysis?commodity={commodity}',
                    description: 'Get market analysis'
                }
            },
            marketplace: {
                products: {
                    list: {
                        method: 'GET',
                        url: '/api/products?page={page}&limit={limit}&category={category}&search={search}',
                        description: 'Get all products'
                    },
                    get: {
                        method: 'GET',
                        url: '/api/products/{id}',
                        description: 'Get product by ID'
                    },
                    create: {
                        method: 'POST',
                        url: '/api/products',
                        description: 'Create new product (farmers only)',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ name, description, price, category, stock, images, organic }'
                    },
                    update: {
                        method: 'PUT',
                        url: '/api/products/{id}',
                        description: 'Update product (owner only)',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    delete: {
                        method: 'DELETE',
                        url: '/api/products/{id}',
                        description: 'Delete product (owner only)',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                orders: {
                    list: {
                        method: 'GET',
                        url: '/api/orders',
                        description: 'Get user orders',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    get: {
                        method: 'GET',
                        url: '/api/orders/{id}',
                        description: 'Get order by ID',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    create: {
                        method: 'POST',
                        url: '/api/orders',
                        description: 'Create new order',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ items: [{ productId, quantity }], deliveryAddress }'
                    },
                    updateStatus: {
                        method: 'PUT',
                        url: '/api/orders/{id}/status',
                        description: 'Update order status (seller/admin only)',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ status }'
                    }
                },
                deliveries: {
                    list: {
                        method: 'GET',
                        url: '/api/deliveries',
                        description: 'Get user deliveries',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    get: {
                        method: 'GET',
                        url: '/api/deliveries/{id}',
                        description: 'Get delivery by ID',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    updateStatus: {
                        method: 'PUT',
                        url: '/api/deliveries/{id}/status',
                        description: 'Update delivery status',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ status, location }'
                    },
                    track: {
                        method: 'GET',
                        url: '/api/deliveries/track/{trackingId}',
                        description: 'Track delivery by tracking ID'
                    }
                },
                cart: {
                    get: {
                        method: 'GET',
                        url: '/api/cart',
                        description: 'Get user cart',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    add: {
                        method: 'POST',
                        url: '/api/cart',
                        description: 'Add item to cart',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ productId, quantity }'
                    },
                    update: {
                        method: 'PUT',
                        url: '/api/cart/{productId}',
                        description: 'Update cart item quantity',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ quantity }'
                    },
                    remove: {
                        method: 'DELETE',
                        url: '/api/cart/{productId}',
                        description: 'Remove item from cart',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    clear: {
                        method: 'DELETE',
                        url: '/api/cart',
                        description: 'Clear entire cart',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                wishlist: {
                    get: {
                        method: 'GET',
                        url: '/api/wishlist',
                        description: 'Get user wishlist',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    add: {
                        method: 'POST',
                        url: '/api/wishlist',
                        description: 'Add product to wishlist',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ productId }'
                    },
                    remove: {
                        method: 'DELETE',
                        url: '/api/wishlist/{productId}',
                        description: 'Remove from wishlist',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    check: {
                        method: 'GET',
                        url: '/api/wishlist/{productId}/status',
                        description: 'Check if product is in wishlist',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                reviews: {
                    getProduct: {
                        method: 'GET',
                        url: '/api/reviews/product/{productId}?page={page}&limit={limit}',
                        description: 'Get product reviews'
                    },
                    create: {
                        method: 'POST',
                        url: '/api/reviews',
                        description: 'Create product review',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ productId, orderId, rating, title, comment, images }'
                    },
                    update: {
                        method: 'PUT',
                        url: '/api/reviews/{reviewId}',
                        description: 'Update review (owner only)',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    delete: {
                        method: 'DELETE',
                        url: '/api/reviews/{reviewId}',
                        description: 'Delete review (owner only)',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    getUser: {
                        method: 'GET',
                        url: '/api/reviews/user?page={page}&limit={limit}',
                        description: 'Get user reviews',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                categories: {
                    list: {
                        method: 'GET',
                        url: '/api/categories',
                        description: 'Get all categories'
                    },
                    create: {
                        method: 'POST',
                        url: '/api/categories',
                        description: 'Create category (admin only)',
                        headers: { Authorization: 'Bearer <token>' },
                        body: '{ name, slug, description, image, parent, sortOrder }'
                    },
                    update: {
                        method: 'PUT',
                        url: '/api/categories/{id}',
                        description: 'Update category (admin only)',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    delete: {
                        method: 'DELETE',
                        url: '/api/categories/{id}',
                        description: 'Delete category (admin only)',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                notifications: {
                    get: {
                        method: 'GET',
                        url: '/api/notifications?page={page}&limit={limit}&unreadOnly={true}',
                        description: 'Get user notifications',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    markRead: {
                        method: 'PUT',
                        url: '/api/notifications/{id}/read',
                        description: 'Mark notification as read',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    markAllRead: {
                        method: 'PUT',
                        url: '/api/notifications/read-all',
                        description: 'Mark all notifications as read',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    delete: {
                        method: 'DELETE',
                        url: '/api/notifications/{id}',
                        description: 'Delete notification',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                },
                analytics: {
                    seller: {
                        method: 'GET',
                        url: '/api/analytics/seller?period={7d|30d|90d|1y}',
                        description: 'Get seller analytics',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    buyer: {
                        method: 'GET',
                        url: '/api/analytics/buyer?period={7d|30d|90d|1y}',
                        description: 'Get buyer analytics',
                        headers: { Authorization: 'Bearer <token>' }
                    },
                    product: {
                        method: 'GET',
                        url: '/api/analytics/product/{productId}?period={7d|30d|90d|1y}',
                        description: 'Get product analytics',
                        headers: { Authorization: 'Bearer <token>' }
                    }
                }
            }
        },
        database: global.dbConnected ? 'Connected' : 'Mock Mode',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Export app for testing. Start server only when run directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);

        // Initialize payment maintenance jobs
        if (global.dbConnected) {
            paymentMaintenance.initializeJobs();
            paymentMaintenance.startJobs();
            console.log('✅ Payment maintenance jobs started');
        } else {
            console.log('⚠️  Payment maintenance jobs not started (database not connected)');
        }
    });
}

module.exports = app;