namespace JSX {
  interface IntrinsicElements {
    dialog: React.DetailedHTMLProps<React.DialogHTMLAttributes<HTMLDialogElement>, HTMLDialogElement> & {
      closedby?: string;
    };
  }
}
