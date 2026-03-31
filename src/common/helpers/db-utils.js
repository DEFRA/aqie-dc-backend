// Utility functions for db-service.js
import crypto from 'crypto'

export const generateSecureId = () => {
  return crypto
    .randomBytes(9)
    .toString('base64') // 12 chars but includes +=/
    .replace(/[^a-zA-Z0-9]/g, '') // remove symbols
    .slice(0, 12)
}

export const findCertified = (
  walesApproval,
  niApproval,
  scotApproval,
  engApproval
) => {
  const approvedRegions = []

  if (walesApproval === 'Certified') {
    approvedRegions.push('Wales')
  }
  if (niApproval === 'Certified') {
    approvedRegions.push('Northern Ireland')
  }
  if (scotApproval === 'Certified') {
    approvedRegions.push('Scotland')
  }
  if (engApproval === 'Certified') {
    approvedRegions.push('England')
  }

  return approvedRegions
}
