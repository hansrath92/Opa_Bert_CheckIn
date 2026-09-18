// Wird im "Opa anrufen"-Button client-seitig genutzt, muss daher NEXT_PUBLIC_-
// prefixed sein und landet im ausgelieferten JS-Bundle - das ist unvermeidbar,
// da die Nummer aktiv in der UI gebraucht wird. Der Punkt hier ist, sie aus
// dem Quellcode/GitHub-Repo zu entfernen, wo sie bisher auch ohne jede
// Anmeldung einsehbar war.
export const OPA_PHONE_NUMBER = process.env.NEXT_PUBLIC_OPA_PHONE_NUMBER!;
