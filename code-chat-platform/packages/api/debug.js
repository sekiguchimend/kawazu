const dotenv = require('dotenv');
dotenv.config();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 30) + '...' : 'undefined');
console.log('Contains mock:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.includes('mock') : false);

const shouldBeTestMode = process.env.NODE_ENV === 'development' && 
  (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('mock'));
console.log('Should be test mode:', shouldBeTestMode);