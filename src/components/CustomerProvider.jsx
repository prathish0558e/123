import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { customerApi } from "../lib/customer.js";

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await customerApi.session();
      setUser(data.ok ? data.user : null);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn: async (payload) => {
        const data = await customerApi.login(payload);
        setUser(data.user);
        return data.user;
      },
      register: async (payload) => {
        const data = await customerApi.register(payload);
        setUser(data.user);
        return data.user;
      },
      signOut: async () => {
        await customerApi.logout();
        setUser(null);
      },
      /** Continue with Google — the server has already verified the token. */
      googleSignIn: async (credential) => {
        const data = await customerApi.google(credential);
        setUser(data.user);
        return data.user;
      },
      refresh,
    }),
    [user, loading]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const value = useContext(CustomerContext);
  if (!value) throw new Error("useCustomer must be used inside CustomerProvider");
  return value;
}
