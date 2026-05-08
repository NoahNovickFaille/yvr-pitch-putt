/** Mount this component only while the scanner should be open (see parent `scannerVisible`). */
export type MembershipCardScannerProps = {
  onClose: () => void;
  /** Called once when a barcode/QR decode succeeds; scanner closes after await. */
  onScan: (rawValue: string) => void | Promise<void>;
};
