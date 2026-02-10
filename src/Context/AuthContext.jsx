import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";

import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as fbSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
} from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            try {
                if (fbUser) {
                    const userRef = doc(db, "users", fbUser.uid);
                    const snap = await getDoc(userRef);

                    if (!snap.exists()) {
                        await setDoc(userRef, {
                            uid: fbUser.uid,
                            email: fbUser.email,
                            displayName: fbUser.displayName ?? "",
                            photoURL: fbUser.photoURL ?? "",
                            createdAt: serverTimestamp(),
                        });
                    }

                    setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName, photoURL: fbUser.photoURL });
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth state handling error:", err);
            } finally {
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    async function signUp(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(cred.user, { displayName });
        }
        const userRef = doc(db, "users", cred.user.uid);
        await setDoc(userRef, {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName ?? displayName ?? "",
            photoURL: cred.user.photoURL ?? "",
            createdAt: serverTimestamp(),
        });
        setUser(cred.user);
        return cred.user;
    }

    async function login(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        setUser(cred.user);
        return cred.user;
    }

    async function logout() {
        await fbSignOut(auth);
        setUser(null);
    }

    async function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    async function signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        // ensure user doc exists
        const userRef = doc(db, "users", result.user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName ?? "",
                photoURL: result.user.photoURL ?? "",
                createdAt: serverTimestamp(),
            });
        }
        setUser(result.user);
        return result.user;
    }

    const value = {
        user,
        authLoading,
        signUp,
        login,
        logout,
        resetPassword,
        signInWithGoogle,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}