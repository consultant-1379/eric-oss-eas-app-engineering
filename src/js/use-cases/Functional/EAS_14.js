import { describe } from '../../utility/describe.js';
import { setCmHandleCount, discoverStatusCheck, discoveredSubsystemDeletedCheck, getCmHandlesForEnm, deleteSubsystem, registerENM, startFrame, endLine } from '../../utility/utility.js';

export default function (subsystemId, data, headSef) {
  startFrame('Starting EAS_TC_014: Extend EAS testcases related to the new state handling in ENM Discovery Adapter');
  const RadioNodenodescount = data.radiocnt;
  const SharedCNFnodescount = data.sharedcnt;
  describe('EAS_14', function () {
    console.log('Executing EAS_14');
    // GAT_3_1 'Step 4: Waiting for discovery' already had these steps
    // also cmHandleDiscovery line 66

    console.log('Check #1: Register an ENM into Connected Systems and send the deregister request while the discovery state is still CREATING.');
    setCmHandleCount(1500, 'Hungary');
    subsystemId = registerENM('create_and_delete');
    //becase of return [subsystemId, name] we need:
    subsystemId = subsystemId[0];
    discoverStatusCheck(subsystemId, 'CREATING');
    deleteSubsystem(subsystemId);
    discoveredSubsystemDeletedCheck(subsystemId);
    getCmHandlesForEnm(subsystemId, 0, headSef);

    console.log('Check #2: Negative testcase: Register an ENM wait until the state is CREATED, trigger the deregistration, and send a register request while it is in DELETING state.');
    setCmHandleCount(100, 'Ireland');
    subsystemId = registerENM('Interrupted_delete');
    //becase of return [subsystemId, name] we need:
    subsystemId = subsystemId[0];
    discoverStatusCheck(subsystemId, 'CREATED');
    deleteSubsystem(subsystemId);
    let subsystemId2 = registerENM('ENM_register_for_2nd_time');
    //becase of return [subsystemId, name] we need:
    subsystemId2 = subsystemId2[0];
    var statusCheckResult = discoverStatusCheck(subsystemId2, 'CREATED');
    discoveredSubsystemDeletedCheck(subsystemId);
    getCmHandlesForEnm(subsystemId, 0, headSef);
    let cmHandleCount;
    if (statusCheckResult[2] === true) {
      cmHandleCount = RadioNodenodescount + SharedCNFnodescount * 3;
    } else {
      cmHandleCount = RadioNodenodescount;
    }
    console.log('count of cmHandle : > > ', cmHandleCount);
    getCmHandlesForEnm(subsystemId2, cmHandleCount, headSef);
    //clean up after state tests:
    deleteSubsystem(subsystemId2);
    discoveredSubsystemDeletedCheck(subsystemId2);
    getCmHandlesForEnm(subsystemId2, 0, headSef);
    subsystemId = subsystemId2; // only necessary if the whole test is moved to GAT.3.1
  });
  endLine('Finished EAS_TC_014');
}
