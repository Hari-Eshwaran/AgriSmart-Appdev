const { Demand, Notification, User } = require('../models/index');
const { sendEmail, sendPush } = require('../utils/notifications');

// Create a demand (buyer)
const createDemand = async (req, res) => {
    try {
        const { commodity, quantity, unit, location, desiredBy, notes } = req.body;

        // Basic validation
        if (!commodity || !quantity) {
            return res.status(400).json({ message: 'commodity and quantity are required' });
        }

        const demand = new Demand({
            buyer: req.user._id,
            commodity,
            quantity,
            unit: unit || 'kg',
            location: location || {},
            desiredBy: desiredBy || null,
            notes: notes || ''
        });

        await demand.save();

        // Create notification for admins optionally (or broadcast) - simple approach: no broadcast
        res.status(201).json({ message: 'Demand created', demand });
    } catch (error) {
        console.error('createDemand error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get demands - behaviour depends on role
const getDemands = async (req, res) => {
    try {
        const user = req.user;
        const { page = 1, limit = 20, status, commodity } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};
        if (status) filter.status = status;
        if (commodity) filter.commodity = commodity;

        if (!user) {
            // Unauthenticated: only show open demands
            filter.status = 'open';
            const demands = await Demand.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip).populate('buyer', 'name buyerProfile');
            return res.json({ demands });
        }

        if (user.role === 'buyer') {
            filter.buyer = user._id;
            const demands = await Demand.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip).populate('seller', 'name farmerProfile').populate('buyer', 'name buyerProfile');
            return res.json({ demands });
        }

        if (user.role === 'farmer') {
            // Farmers see open demands and demands they have accepted/rejected
            filter = filter || {};
            filter.$or = [ { status: 'open' }, { seller: user._id } ];
            const demands = await Demand.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip).populate('buyer', 'name buyerProfile');
            return res.json({ demands });
        }

        // admin or others
        const demands = await Demand.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip).populate('buyer', 'name buyerProfile').populate('seller', 'name farmerProfile');
        res.json({ demands });
    } catch (error) {
        console.error('getDemands error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getDemandById = async (req, res) => {
    try {
        const { id } = req.params;
        const demand = await Demand.findById(id).populate('buyer', 'name buyerProfile').populate('seller', 'name farmerProfile');
        if (!demand) return res.status(404).json({ message: 'Demand not found' });
        res.json({ demand });
    } catch (error) {
        console.error('getDemandById error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update demand (buyer can update while open)
const updateDemand = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const demand = await Demand.findById(id);
        if (!demand) return res.status(404).json({ message: 'Demand not found' });

        // Only buyer (owner) or admin can update; buyer only when status is open
        if (req.user.role !== 'admin' && !demand.buyer.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not permitted' });
        }

        if (req.user.role !== 'admin' && demand.status !== 'open') {
            return res.status(400).json({ message: 'Can only update demand while it is open' });
        }

        // Apply fields safely
        const allowed = ['commodity', 'quantity', 'unit', 'location', 'desiredBy', 'notes'];
        allowed.forEach(k => {
            if (updates[k] !== undefined) demand[k] = updates[k];
        });

        await demand.save();
        res.json({ message: 'Demand updated', demand });
    } catch (error) {
        console.error('updateDemand error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete / cancel demand (buyer can cancel while open)
const deleteDemand = async (req, res) => {
    try {
        const { id } = req.params;
        const demand = await Demand.findById(id);
        if (!demand) return res.status(404).json({ message: 'Demand not found' });

        if (req.user.role !== 'admin' && !demand.buyer.equals(req.user._id)) {
            return res.status(403).json({ message: 'Not permitted' });
        }

        if (req.user.role !== 'admin' && demand.status !== 'open') {
            // Buyers may only cancel open demands
            return res.status(400).json({ message: 'Can only cancel an open demand' });
        }

        demand.status = 'cancelled';
        await demand.save();
        res.json({ message: 'Demand cancelled', demand });
    } catch (error) {
        console.error('deleteDemand error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Farmer responds to a demand (accept/reject)
const respondToDemand = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, priceOffer, notes } = req.body; // action: 'accept' | 'reject'

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action' });
        }

        const demand = await Demand.findById(id).populate('buyer');
        if (!demand) return res.status(404).json({ message: 'Demand not found' });

        if (demand.status !== 'open') {
            return res.status(400).json({ message: 'Cannot respond to a demand that is not open' });
        }

        if (action === 'accept') {
            demand.status = 'accepted';
            demand.seller = req.user._id;
            if (priceOffer !== undefined) demand.priceOffer = priceOffer;
            if (notes) demand.notes = (demand.notes || '') + '\nSeller note: ' + notes;

            // Notify buyer (in-app, email, push if available)
            const note = await Notification.create({
                user: demand.buyer._id,
                type: 'demand_accepted',
                title: 'Demand Accepted',
                message: `Your demand for ${demand.quantity} ${demand.unit} ${demand.commodity} was accepted by ${req.user.name}`,
                data: { demandId: demand._id }
            });
            // Try email/push
            try {
                if (demand.buyer && demand.buyer.email) {
                    await sendEmail({
                        to: demand.buyer.email,
                        subject: 'Your demand was accepted',
                        text: note.message
                    });
                }
            } catch (e) {
                console.warn('Email notify failed:', e.message);
            }

        } else if (action === 'reject') {
            demand.status = 'rejected';
            demand.seller = req.user._id; // record who rejected
            if (notes) demand.notes = (demand.notes || '') + '\nSeller note: ' + notes;

            // Notify buyer (in-app + email)
            const note = await Notification.create({
                user: demand.buyer._id,
                type: 'demand_rejected',
                title: 'Demand Rejected',
                message: `Your demand for ${demand.quantity} ${demand.unit} ${demand.commodity} was rejected by ${req.user.name}`,
                data: { demandId: demand._id }
            });
            try {
                if (demand.buyer && demand.buyer.email) {
                    await sendEmail({
                        to: demand.buyer.email,
                        subject: 'Your demand was rejected',
                        text: note.message
                    });
                }
            } catch (e) {
                console.warn('Email notify failed:', e.message);
            }
        }

        await demand.save();
        res.json({ message: `Demand ${action}ed`, demand });
    } catch (error) {
        console.error('respondToDemand error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createDemand,
    getDemands,
    getDemandById,
    updateDemand,
    deleteDemand,
    respondToDemand
};
