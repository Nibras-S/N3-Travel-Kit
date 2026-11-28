export interface TenantBranding {
  name: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  additionalPhone: string;
  email: string;
  hasLogo: boolean;
  logoUrl: string;
}

export const emptyBranding = (name: string): TenantBranding => ({
  name, addressLine1: '', addressLine2: '', phone: '', additionalPhone: '', email: '', hasLogo: false, logoUrl: '',
});
