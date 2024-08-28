import crypto from 'k6/crypto';

export function getcmHandleid(targetDnPrefix, targetNode) {
  if (targetNode === '') {
    let CmHandle_id = crypto.md5('EricssonENMAdapter-' + targetDnPrefix, 'hex').toUpperCase();
    return CmHandle_id;
  } else {
    let CmHandle_id = crypto.md5('EricssonENMAdapter-' + targetDnPrefix + ',' + targetNode, 'hex').toUpperCase();
    return CmHandle_id;
  }
}

export function generateCmHandleList(targetDnPrefix, targetNode, count, subsystemId, nodeModelIdentity) {
  let cmHandleIds = [];
  let cmHandleBody = [];
  for (let i = 1; i <= count; i++) {
    let number = String(i).padStart(4, '0');
    let targetDnPrefixnew = targetDnPrefix + number;
    let targetNodenew = targetNode + number;
    let cmHandle_id = crypto.md5('EricssonENMAdapter-' + targetDnPrefixnew + ',' + targetNodenew, 'hex').toUpperCase();
    cmHandleIds.push(cmHandle_id);
    cmHandleBody.push({
      cmHandle: `${cmHandle_id}`,
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefixnew}`,
        targetNode: `${targetNodenew}`,
        nodeModelIdentity: `${nodeModelIdentity}`,
        ossModelIdentity: `${nodeModelIdentity}`,
        softwareSyncStatus: 'AS_IS',
        neType: 'RadioNode',
      },
      publicCmHandleProperties: {
        emsid: `${subsystemId}`,
      },
    });
  }
  return { cmHandleIds, cmHandleBody };
}
