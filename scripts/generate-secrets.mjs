import { randomBytes } from 'node:crypto';

console.info('=============================================');
console.info(' Namma Dina - Production Secret Generator');
console.info('=============================================\n');

const jwtSecret = randomBytes(64).toString('hex');
const sessionSecret = randomBytes(64).toString('hex');

console.info('Add these generated secrets to your production environment (Render / .env.production):\n');
console.info(`JWT_SECRET=${jwtSecret}`);
console.info(`SESSION_SECRET=${sessionSecret}`);
console.info('\nKeep these values strictly confidential and never commit them to source control.');

