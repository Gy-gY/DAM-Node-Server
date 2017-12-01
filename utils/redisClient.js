import redis from 'redis';
import {tokenStore as redisCfg} from '../config';
export default redis.createClient(redisCfg);