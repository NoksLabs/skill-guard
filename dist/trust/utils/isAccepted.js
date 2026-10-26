                                                           
                                                                     

export const isAccepted = (finding         , accepted                                )          =>
  accepted.some(
    (entry) =>
      entry.rule === finding.rule &&
      entry.file === finding.file &&
      entry.fileSha256 === finding.fileSha256,
  );
