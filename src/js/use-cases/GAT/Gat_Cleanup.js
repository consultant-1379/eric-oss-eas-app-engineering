import { deleteSubsystem, getCmHandlesForEnm, CTScleanupCheck } from '../../utility/utility.js';
import { subsystemId } from './Gat_3_1.js';
import { describe } from '../../utility/describe.js';

export default function () {
  console.log('Starting Gat Cleanup...');
  describe('Gat Cleanup', function () {
    describe('Delete Subsystem', function () {
      deleteSubsystem(subsystemId);
      getCmHandlesForEnm(subsystemId, 0);
      console.log('Check GNBCUCPs in CTS....');
      let ctsType = 'gnbcucp',
        min = 10;
      CTScleanupCheck(ctsType, min, 0, true);
      console.log('Check GNBCUUPs in CTS....');
      ctsType = 'gnbcuup';
      CTScleanupCheck(ctsType, min, 0, true);
      console.log('Check GNBDUs in CTS....');
      ctsType = 'gnbdu';
      CTScleanupCheck(ctsType, min, 0, true);
      console.log('Check NRCell in CTS....');
      ctsType = 'nrcell';
      CTScleanupCheck(ctsType, min, 0, true);
    });
  });
}
