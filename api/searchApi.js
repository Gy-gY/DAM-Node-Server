//对search API的封装
import fetch from "isomorphic-fetch";
import {search} from '../config/micro-services';
import {apiLogger} from '../lib/log';

export const searchQ = (q) => {
  return fetch(search + '/_search?q=' + encodeURI(q), {})
  .then(res => res.json());
}

