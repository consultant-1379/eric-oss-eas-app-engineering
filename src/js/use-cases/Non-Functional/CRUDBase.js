import http from 'k6/http';
import { check } from 'k6';
import { errorCounter } from '../../main.js';

export let customMetrics = {};

export function callCRUDOp(method, url, body, params) {
  let key = '';
  if (method === 'POST') {
    key = 'createOp';
  } else if (method === 'PATCH') {
    key = 'updateOp';
  } else if (method === 'GET') {
    key = 'readOp';
  } else {
    key = 'deleteOp';
  }
  let res = http.request(method, url, body, params);
  customMetrics[key].add(res.timings.duration);
  if (res.status < 200 || res.status >= 300) {
    console.log(`${key} ${__VU} - ${__ITER} Duration: ${res.timings.duration} ResponseCode: ${res.status} ResponseBody: ${JSON.stringify(res.body)}`);
    //errorCounter.add(1);
  } else {
    if (__ITER % 100 == 0) {
      console.log(`${key} ${__VU} - ${__ITER} Duration: ${res.timings.duration} ResponseCode: ${res.status}`);
    }
    const r = check(res, {
      'Operation success rate: ': (r) => res.status <= 204,
    });
  }
  // if (res.status > 204) {
  //   console.log('');
  //   console.log('Request:');
  //   console.log(url);
  //   console.log('Response:');
  //   console.log(res.status);
  //   console.log(JSON.stringify(res));
  // }
}

export function callCRUDOpSharedCNF(method, url, body, params) {
  let key = '';
  if (method === 'POST') {
    key = 'createOpSharedCNF';
  } else if (method === 'PATCH') {
    key = 'updateOpSharedCNF';
  } else if (method === 'GET') {
    key = 'readOpSharedCNF';
  } else {
    key = 'deleteOpSharedCNF';
  }
  let res = http.request(method, url, body, params);
  customMetrics[key].add(res.timings.duration);
  if (res.status < 200 || res.status >= 300) {
    console.log(`${key} ${__VU} - ${__ITER} Duration: ${res.timings.duration} ResponseCode: ${res.status} ResponseBody: ${JSON.stringify(res.body)}`);
  } else {
    if (__ITER % 100 == 0) {
      console.log(`${key} ${__VU} - ${__ITER} Duration: ${res.timings.duration} ResponseCode: ${res.status}`);
    }
    const r = check(res, {
      'Operation success rate: ': (r) => res.status <= 204,
    });
  }
}
