export function getActiveCertificateFilter() {
  return {
    certificateIssuedAt: { $ne: null },
    certificateUrl: { $type: "string", $ne: "" },
    $or: [
      { certificateState: "CERTIFICATE_ACTIVE" },
      { certificateState: { $exists: false } },
    ],
  };
}

export function isActiveCertificateRecord(achievement) {
  return Boolean(
    achievement?.certificateIssuedAt &&
      achievement?.certificateUrl &&
      (achievement.certificateState === "CERTIFICATE_ACTIVE" ||
        achievement.certificateState === undefined)
  );
}
