const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-riyad:mdriyad371@riyad.gljntda.mongodb.net/?retryWrites=true&w=majority&appName=riyad";

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// ==================== MODELS ====================

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
    name: String, category: String, basePrice: Number, oldPrice: Number,
    image: String, sizes: [{ name: String, price: Number }],
    stock: Number, rating: Number, badge: String
});

const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        size: String, quantity: { type: Number, default: 1 }
    }],
    updatedAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
    orderId: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String, size: String, quantity: Number, price: Number
    }],
    customer: { name: String, phone: String, division: String, district: String, address: String },
    paymentMethod: String, senderNumber: String, transactionId: String,
    subtotal: Number, deliveryCharge: Number, total: Number,
    orderStatus: { type: String, default: 'pending' },
    paymentStatus: { type: String, default: 'pending' },
    tracking: String, createdAt: { type: Date, default: Date.now }
});

const WishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Cart = mongoose.model('Cart', CartSchema);
const Order = mongoose.model('Order', OrderSchema);
const Wishlist = mongoose.model('Wishlist', WishlistSchema);

// ==================== MIDDLEWARE ====================

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(401).json({ error: 'User not found' });
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ==================== INITIAL DATA ====================

const initializeProducts = async () => {
    const count = await Product.countDocuments();
    if (count === 0) {
        const products = [
            { name:"প্রিমিয়াম ফর্মাল শার্ট", category:"clothing", basePrice:1200, oldPrice:1800, image:"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop", sizes:[{name:"M", price:1200},{name:"L", price:1250},{name:"XL", price:1300}], stock:5, rating:4.5, badge:"সেল ৩০%" },
            { name:"ওয়্যারলেস ইয়ারবাড", category:"electronics", basePrice:2500, oldPrice:3500, image:"https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop", sizes:[{name:"One Size", price:2500}], stock:8, rating:4.8, badge:"" },
            { name:"প্রিমিয়াম হ্যান্ডব্যাগ", category:"accessories", basePrice:1800, oldPrice:2200, image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop", sizes:[{name:"One Size", price:1800}], stock:3, rating:4.2, badge:"" },
            { name:"স্মার্ট ওয়াচ", category:"electronics", basePrice:4200, oldPrice:5500, image:"https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop", sizes:[{name:"Adjustable", price:4200}], stock:2, rating:4.7, badge:"বেস্ট সেলার" },
            { name:"ট্রেন্ডি জিন্স প্যান্ট", category:"clothing", basePrice:1600, oldPrice:2400, image:"https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop", sizes:[{name:"30", price:1600},{name:"32", price:1650},{name:"34", price:1700}], stock:10, rating:4.3, badge:"" },
            { name:"ডিজাইনার সানগ্লাস", category:"accessories", basePrice:1200, oldPrice:1800, image:"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop", sizes:[{name:"One Size", price:1200}], stock:0, rating:4.0, badge:"আউট অফ স্টক" },
            { name:"মেকানিক্যাল কিবোর্ড", category:"electronics", basePrice:3500, oldPrice:4500, image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop", sizes:[{name:"Standard", price:3500}], stock:4, rating:4.9, badge:"হট ডিল" },
            { name:"প্রিমিয়াম লেদার বেল্ট", category:"accessories", basePrice:800, oldPrice:1200, image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", sizes:[{name:"S", price:800},{name:"M", price:850},{name:"L", price:900}], stock:7, rating:4.1, badge:"" }
        ];
        await Product.insertMany(products);
        console.log('✅ Products added');
    }
};

// ==================== ROUTES ====================

// Register
app.post('/api/auth/register', [
    body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 4 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email exists' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        await new Cart({ userId: user._id, items: [] }).save();
        await new Wishlist({ userId: user._id, products: [] }).save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'mysecretkey', { expiresIn: '7d' });
        
        res.status(201).json({ message: 'Registered', token, user: { id: user._id, name, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', [
    body('email').isEmail(), body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'mysecretkey', { expiresIn: '7d' });
        
        res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get products
app.get('/api/products', async (req, res) => {
    try {
        const { search, category, sort } = req.query;
        let filter = {};
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (category && category !== 'all') filter.category = category;
        
        let products = await Product.find(filter);
        if (sort === 'price_asc') products.sort((a, b) => a.basePrice - b.basePrice);
        if (sort === 'price_desc') products.sort((a, b) => b.basePrice - a.basePrice);
        
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cart
app.get('/api/cart', authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to cart
app.post('/api/cart/add', authMiddleware, async (req, res) => {
    try {
        const { productId, size, quantity = 1 } = req.body;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        
        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
        
        const existing = cart.items.find(i => i.productId.toString() === productId && i.size === size);
        if (existing) existing.quantity += quantity;
        else cart.items.push({ productId, size, quantity });
        
        cart.updatedAt = new Date();
        await cart.save();
        await cart.populate('items.productId');
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update cart
app.put('/api/cart/update/:itemIndex', authMiddleware, async (req, res) => {
    try {
        const { operation } = req.body;
        const idx = parseInt(req.params.itemIndex);
        let cart = await Cart.findOne({ userId: req.user._id });
        
        if (!cart || !cart.items[idx]) return res.status(404).json({ error: 'Item not found' });
        
        if (operation === 'inc') cart.items[idx].quantity++;
        else if (operation === 'dec') {
            cart.items[idx].quantity--;
            if (cart.items[idx].quantity <= 0) cart.items.splice(idx, 1);
        }
        
        cart.updatedAt = new Date();
        await cart.save();
        await cart.populate('items.productId');
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from cart
app.delete('/api/cart/remove/:itemIndex', authMiddleware, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.user._id });
        if (cart) {
            cart.items.splice(parseInt(req.params.itemIndex), 1);
            await cart.save();
            await cart.populate('items.productId');
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create order
app.post('/api/orders', authMiddleware, async (req, res) => {
    try {
        const { customer, paymentMethod, senderNumber, transactionId } = req.body;
        const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
        
        if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart empty' });
        
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of cart.items) {
            const product = item.productId;
            const sizeObj = product.sizes.find(s => s.name === item.size);
            const price = sizeObj ? sizeObj.price : product.basePrice;
            subtotal += price * item.quantity;
            orderItems.push({ productId: product._id, name: product.name, size: item.size, quantity: item.quantity, price });
            product.stock -= item.quantity;
            await product.save();
        }
        
        const deliveryCharge = customer.district === 'ঢাকা' ? 60 : 100;
        const total = subtotal + deliveryCharge;
        const orderId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
        
        const order = new Order({ orderId, userId: req.user._id, items: orderItems, customer, paymentMethod, senderNumber, transactionId, subtotal, deliveryCharge, total, tracking: 'অর্ডার প্রক্রিয়াধীন' });
        await order.save();
        
        cart.items = [];
        await cart.save();
        
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get orders
app.get('/api/orders', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get wishlist
app.get('/api/wishlist', authMiddleware, async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products');
        if (!wishlist) wishlist = new Wishlist({ userId: req.user._id, products: [] });
        await wishlist.save();
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to wishlist
app.post('/api/wishlist/add', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.body;
        let wishlist = await Wishlist.findOne({ userId: req.user._id });
        if (!wishlist) wishlist = new Wishlist({ userId: req.user._id, products: [] });
        
        if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
        }
        await wishlist.populate('products');
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from wishlist
app.delete('/api/wishlist/remove/:productId', authMiddleware, async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ userId: req.user._id });
        if (wishlist) {
            wishlist.products = wishlist.products.filter(p => p.toString() !== req.params.productId);
            await wishlist.save();
            await wishlist.populate('products');
        }
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ==================== EXPORT FOR VERCEL ====================

mongoose.connection.once('open', async () => {
    await initializeProducts();
    console.log('✅ Ready');
});

module.exports = app;
