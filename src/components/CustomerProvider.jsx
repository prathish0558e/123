import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { customerApi } from "../lib/customer.js";

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerApi.session().then((data) => setUser(data.ok ? data.user : null)).catch(() => setUser(null)).finally(() => setLoading(false));
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
