// When a tournament takes sign-ups (ADR 0089), shared by the app and the Worker: once an admin opens it by hand, or
// from the day it's set to open, until the end of its closing day (London).

interface SigningUp {
  status: string;
  signupOpensOn: string | null;
  signupClosesOn: string | null;
}

/** Sign-up is open on `today` (a London YYYY-MM-DD). */
export const signupOpen = (t: SigningUp, today: string) =>
  !signupOver(t, today) &&
  (t.status === "open" || (t.status === "planned" && !!t.signupOpensOn && today >= t.signupOpensOn));

/** Past its closing day. */
export const signupOver = (t: Pick<SigningUp, "signupClosesOn">, today: string) =>
  !!t.signupClosesOn && today > t.signupClosesOn;
