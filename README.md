# Routeur LLM (llm-router)

Une petite application Next.js pour tester et comparer différents modèles d'intelligence artificielle (Claude, ChatGPT, Gemini) au même endroit.

## Fonctionnalités

- **Mode Discussion (Chat)** : Discuter avec une IA avec affichage du texte au fur et à mesure (streaming).
- **Mode Arène (Comparaison)** : Poser la même question à deux ou trois modèles en même temps pour comparer la rapidité et la qualité des réponses.
- **Historique local** : Vos messages sont sauvegardés dans votre navigateur.
- **Sécurité** : Vos clés d'API restent sur le serveur et ne sont jamais visibles depuis le navigateur.

## Comment lancer le projet

Il vous faut Node.js (version 20 ou plus) et `pnpm`.

```bash
# 1. Installer les dépendances
pnpm install

# 2. Créer le fichier de configuration
cp .env.example .env

# 3. Mettre vos clés d'API dans le fichier .env (si vous en avez)

# 4. Lancer le site
pnpm run dev
```

Ouvrez ensuite `http://localhost:3000` dans votre navigateur.
