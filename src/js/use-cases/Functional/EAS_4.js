import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_MODEL_ADAPTER_URL, IAM_HOST, NCMP_URL, TIEH_URL } from '../../utility/constants.js';
import { startFrame, endLine } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import generator from 'k6/x/opentelemetry';

export default function (head) {
  startFrame('Starting EAS_TC_004: ENM model Adapter Health check, Tracing');
  describe('EAS_TC_004: ENM Model Adapter Healthcheck', function () {
    let TC4 = http.get(ENM_MODEL_ADAPTER_URL + 'actuator/health');

    console.log('Check #1: Status is 200');
    console.log('Check #1: Response body is not empty');
    console.log('Check #1: Response body contains id details');
    const res = check(TC4, {
      'Status is 200': (r) => TC4.status === 200,
      'Response body is not empty': (r) => TC4.body != [],
      'Response body contains id details': (r) => TC4.body.includes('status'),
    });
    if (!res) {
      console.log('ENM Model Adapter Status: ' + TC4.status);
      console.log('ENM Model Adapter Body: ' + TC4.body);
      errorCounter.add(1);
    }
  });
  describe('EAS_TC_004: Check tracing', function () {
    console.log('Checking tracing for NCMP');
    let traceId = generator.newTraceID();
    let spanId = generator.newSpanID();
    console.log('traceId: ' + traceId);
    console.log('spanId: ' + spanId);
    let params = {
      headers: {
        'Content-Type': `application/json`,
        'X-B3-TraceId': traceId,
        'X-B3-SpanId': spanId,
        'X-B3-Sampled': 1,
      },
    };

    let getAnchors = http.post(`${NCMP_URL}ncmp/v1/ch/id-searches`, '{}', params);
    sleep(5);
    let getTrace,
      flag = true,
      retries = 1;
    while (flag && retries <= 5) {
      getTrace = http.get(`${IAM_HOST}hub/eric-dst-query/v1/distributed-trace/viewer/api/traces/${traceId}`, head);
      if (getTrace.status < 200 || getTrace.status >= 300) {
        console.log('TraceId not available in JaegerUI, retrying');
        retries++;
        sleep(5);
      } else {
        flag = false;
      }
    }

    const res = check(getTrace, {
      'Get trace NCMP status is 200: ': getTrace.status == 200,
      'There is NCMP entry in the body': getTrace.body.includes('eric-oss-ncmp'),
    });
    if (!res) {
      console.log('getTrace status: ' + getTrace.status);
      console.log('getTrace body: ' + getTrace.body);
    }

    console.log('Checking tracing for R1 TIES');
    traceId = generator.newTraceID();
    spanId = generator.newSpanID();
    console.log('traceId: ' + traceId);
    console.log('spanId: ' + spanId);
    params.headers['X-B3-TraceId'] = traceId;
    params.headers['X-B3-SpanId'] = spanId;

    let getEntities = http.get(`${TIEH_URL}topology-inventory/v1alpha11/domains/RAN/entity-types/GNBCUUPFunction/entities`, params);
    sleep(5);
    let getTraceTies;
    flag = true;
    retries = 1;
    while (flag && retries <= 5) {
      getTraceTies = http.get(`${IAM_HOST}hub/eric-dst-query/v1/distributed-trace/viewer/api/traces/${traceId}`, head);
      if (getTraceTies.status < 200 || getTraceTies.status >= 300) {
        console.log('TraceId not available in JaegerUI, retrying');
        retries++;
        sleep(5);
      } else {
        flag = false;
      }
    }

    const res2 = check(getTraceTies, {
      'Get trace R1 TIES status is 200: ': getTraceTies.status == 200,
      'There is R1 TIES entry in the body': getTraceTies.body.includes('eric-oss-top-inv-exposure'),
    });
    if (!res2) {
      console.log('getTraceTies status: ' + getTraceTies.status);
      console.log('getTraceTies body: ' + getTraceTies.body);
    }
  });

  endLine('Finished EAS_TC_004');
}
