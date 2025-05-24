
export const isAuthenticated = (): boolean => {
  const user = localStorage.getItem('user');
  return !!user;
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  if (user) {
    return JSON.parse(user);
  }
  return null;
};

export const login = (userData: any) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

export const logout = () => {
  localStorage.removeItem('user');
};
