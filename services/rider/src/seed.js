'use strict';

require('dotenv').config();
const mongoose     = require('mongoose');
const bcrypt       = require('bcryptjs');
const Rider        = require('./models/Rider');
const RiderOrder   = require('./models/RiderOrder');
const RiderEarning = require('./models/RiderEarning');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://shiramianoma:fbvwGfvisio9xHR0@cluster0.9vniycs.mongodb.net/BuyNest?retryWrites=true&w=majority&appName=Cluster0';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing rider data
    await Rider.deleteMany({});
    await RiderOrder.deleteMany({});
    await RiderEarning.deleteMany({});
    console.log('🗑️  Cleared existing rider data');

    // Create demo rider
    const rider = await Rider.create({
      name: 'Demo Rider',
      email: 'rider@demo.com',
      password: 'rider123',
      phone: '+94771234567',
      vehicleType: 'bike',
      isOnline: true,
      currentLocation: { lat: 6.9271, lng: 79.8612 },
      rating: 4.8,
      totalDeliveries: 47,
      totalEarnings: 15800,
    });

    console.log('👤 Demo rider created:', rider.email);

    // Create 3 completed orders
    const completedOrders = [
      {
        riderId: rider._id,
        orderId: 'ORD-SEED-001',
        restaurantId: 'rest-001',
        customerId: 'cust-001',
        restaurantName: 'Colombo Spice House',
        customerName: 'Kamal Perera',
        status: 'DELIVERED',
        pickupLocation: { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort, Sri Lanka' },
        deliveryLocation: { lat: 6.9147, lng: 79.9734, address: 'Malabe, Sri Lanka' },
        earnings: 350,
        distance: 5.2,
        estimatedTime: 20,
        acceptedAt: new Date(Date.now() - 3600000 * 5),
        pickedUpAt: new Date(Date.now() - 3600000 * 4.5),
        deliveredAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        riderId: rider._id,
        orderId: 'ORD-SEED-002',
        restaurantId: 'rest-002',
        customerId: 'cust-002',
        restaurantName: 'Rice & Curry Palace',
        customerName: 'Nimal Silva',
        status: 'DELIVERED',
        pickupLocation: { lat: 6.9344, lng: 79.8428, address: 'Pettah, Colombo' },
        deliveryLocation: { lat: 6.8868, lng: 79.8661, address: 'Wellawatte, Colombo' },
        earnings: 280,
        distance: 3.8,
        estimatedTime: 15,
        acceptedAt: new Date(Date.now() - 3600000 * 3),
        pickedUpAt: new Date(Date.now() - 3600000 * 2.5),
        deliveredAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        riderId: rider._id,
        orderId: 'ORD-SEED-003',
        restaurantId: 'rest-003',
        customerId: 'cust-003',
        restaurantName: 'Burger Lab Colombo',
        customerName: 'Samanthi Fernando',
        status: 'DELIVERED',
        pickupLocation: { lat: 6.9110, lng: 79.8526, address: 'Bambalapitiya, Colombo' },
        deliveryLocation: { lat: 6.8720, lng: 79.8607, address: 'Dehiwala, Sri Lanka' },
        earnings: 320,
        distance: 4.5,
        estimatedTime: 18,
        acceptedAt: new Date(Date.now() - 3600000 * 1.5),
        pickedUpAt: new Date(Date.now() - 3600000 * 1),
        deliveredAt: new Date(Date.now() - 3600000 * 0.5),
      },
    ];

    await RiderOrder.insertMany(completedOrders);
    console.log('📦 3 completed orders created');

    // Create active order for live map demo
    const activeOrder = await RiderOrder.create({
      riderId: rider._id,
      orderId: 'ORD-ACTIVE-001',
      restaurantId: 'rest-004',
      customerId: 'cust-004',
      restaurantName: 'Colombo Food Court',
      customerName: 'Dilshan Jayawardena',
      status: 'ASSIGNED',
      pickupLocation: { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort, Sri Lanka' },
      deliveryLocation: { lat: 6.9147, lng: 79.9734, address: 'Malabe, Sri Lanka' },
      earnings: 400,
      distance: 6.1,
      estimatedTime: 25,
      acceptedAt: new Date(),
    });

    console.log('🗺️  Active order created for live map demo:', activeOrder.orderId);

    // Create earnings records
    const earnings = [
      { riderId: rider._id, orderId: 'ORD-SEED-001', amount: 350, type: 'delivery', status: 'paid', description: 'Delivery from Colombo Spice House' },
      { riderId: rider._id, orderId: 'ORD-SEED-001', amount: 50, type: 'tip', status: 'paid', description: 'Customer tip' },
      { riderId: rider._id, orderId: 'ORD-SEED-002', amount: 280, type: 'delivery', status: 'paid', description: 'Delivery from Rice & Curry Palace' },
      { riderId: rider._id, orderId: 'ORD-SEED-003', amount: 320, type: 'delivery', status: 'pending', description: 'Delivery from Burger Lab Colombo' },
      { riderId: rider._id, orderId: 'ORD-SEED-003', amount: 100, type: 'bonus', status: 'pending', description: 'Peak hour bonus' },
    ];

    await RiderEarning.insertMany(earnings);
    console.log('💰 5 earning records created');

    console.log('\n✅ Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo Login Credentials:');
    console.log('  Email: rider@demo.com');
    console.log('  Password: rider123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
