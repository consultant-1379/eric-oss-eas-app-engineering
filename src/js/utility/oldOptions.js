export const options = {
    scenarios: {
      contacts: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '600m',
      },
      /*cmHandleDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        exec: 'cmHandleDiscovery',
        startTime: '10s',
        maxDuration: '600m',
        env: {},
      },*/
      gnbduTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'gnbduTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      nrcellTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'nrcellTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      gnbcuupTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'gnbcuupTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      gnbcucpTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'gnbcucpTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      nrsectorcarrierTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'nrsectorcarrierTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      enodebTopologyDiscovery: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '60m',
        exec: 'enodebTopologyDiscovery',
        startTime: '90s',
        env: {},
      },
      createOp: {
        executor: 'per-vu-iterations',
        vus: virtual_users,
        iterations: its,
        startTime: '180s',
        maxDuration: '5m',
        exec: 'createOp',
        env: {CM_HANDLE: cmHandlesList[0]},
      },
      readOp: {
        executor: 'per-vu-iterations',
        vus: virtual_users,
        iterations: its,
        startTime: '180s',
        maxDuration: '5m',
        exec: 'readOp',
        env: {CM_HANDLE: cmHandlesList[1]},
      },
      updateOp: {
        executor: 'per-vu-iterations',
        vus: virtual_users,
        iterations: its,
        startTime: '180s',
        maxDuration: '5m',
        exec: 'updateOp',
        env: {CM_HANDLE: cmHandlesList[2]},
      },
      deleteOp: {
        executor: 'per-vu-iterations',
        vus: virtual_users,
        iterations: its,
        startTime: '180s',
        maxDuration: '5m',
        exec: 'deleteOp',
        env: {CM_HANDLE: cmHandlesList[3]},
      },
      CUDop: {
        executor: 'per-vu-iterations',
        vus: virtual_users,
        iterations: its,
        startTime: '180s',
        maxDuration: '5m',
        exec: 'CUDop',
        env: {CM_HANDLE: cmHandlesList[3]},
      }
    },
    thresholds: {
      readOp: ['p(90)<5000'],
      updateOp: ['p(90)<5000'],
      deleteOp: ['p(90)<5000'],
      createOp: ['p(90)<5000'],
      CUDop: ['p(90)<5000'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count'],
    teardownTimeout: '20m',
  };
  //NF_TC
  /*export const options = {
    scenarios: {
      contacts: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '90m',
      },
      performance: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { target: 5, duration: '5m' }, 
          ],
        exec: 'NF_7',
        startTime: '7m', //when we want to start this test. After 40 mins is long? When other tests finish?
      },
      performance2: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { target: 10, duration: '1m' },
          ],
        exec: 'NF_8',
        startTime: '15m', //when we want to start this test. After 40 mins is long? When other tests finish?
      },
      performance3: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { target: 10, duration: '1m' },
          ],
        exec: 'NF_9',
        startTime: '25m', //when we want to start this test. After 40 mins is long? When other tests finish?
      },
    },
    teardownTimeout: '45m',
  };*/