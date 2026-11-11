(() => {
   const PROFILE_KEY = 'player_profile_v1';
   const LEGACY_KEYS = ['mathrush_player_profile_v1'];
   const DEFAULT_AVATARS = [
      '08d694a0343943d7d0b58c1a9c17b525.jpg',
      '3d-rendering-cartoon-man-beach.jpg',
      '3e41eb054e1de1da0adf117bcd0ef515.jpg',
      '45bdf75eb0c698f62db653228a6c9528.jpg',
      '5916012f876c456afd9404f2d4d6b4c8.jpg',
      '825972f6e645e88ef00ca763c6660cc2.jpg',
      '870714d34d7b5e28d7e754c0c5b0d3e6.jpg',
      '8c7fbf419e03b81cab48b949cc5fb8b3.jpg',
      'a8113f148c9636f0ccba6781c7499467.jpg',
      'Capture d’écran 2026-11-07 124510.jpg',
      'Capture d’écran 2026-11-07 124609.jpg',
      'Capture d’écran 2026-11-07 124656.jpg',
      'Capture d’écran 2026-11-07 124723.jpg',
      'Capture d’écran 2026-11-07 124812.jpg',
      'Capture d’écran 2026-11-07 124852.jpg',
      'Capture d’écran 2026-11-07 124928.jpg',
      'Capture d’écran 2026-11-07 124956.jpg',
      'Capture d’écran 2026-11-07 125020.jpg',
      'Capture d’écran 2026-11-07 125053.jpg',
      'Capture d’écran 2026-11-07 125128.jpg',
      'cartoony-ostrich-studio.jpg',
      'ef3a9408a7a62b5c687486eba0b11d7c.jpg',
      'f355af61009f0a0be856871919d9262e.jpg',
      'Screenshot_20261107-124451.png',
      'Screenshot_20261107-124502.png',
      'Screenshot_20261107-124522.png',
      'Screenshot_20261107-124600.png',
      'Screenshot_20261107-124609.png',
      'Screenshot_20261107-124620.png',
      'Screenshot_20261107-125032.png'
   ];

   function readProfile(key) {
      try { return JSON.parse(localStorage.getItem(key) || 'null'); }
      catch (error) { return null; }
   }

   function randomAvatar() {
      const values = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) {
         window.crypto.getRandomValues(values);
         return DEFAULT_AVATARS[values[0] % DEFAULT_AVATARS.length];
      }
      return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
   }

   function imageUrl(avatar) {
      return avatar.startsWith('data:image/') ? avatar : `assets/avatar/${encodeURIComponent(avatar)}`;
   }

   async function encodeAvatar(file) {
      if (!file.type.startsWith('image/')) throw new Error('Choisis un fichier image.');
      if (file.size > 15 * 1024 * 1024) throw new Error('Image trop volumineuse (15 Mo maximum).');
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image illisible.')), 'image/webp', 0.82));
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result);
         reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
         reader.readAsDataURL(blob);
      });
   }

   function mount(elements) {
      let profile = readProfile(PROFILE_KEY);
      if (!profile) profile = LEGACY_KEYS.map(readProfile).find(Boolean) || {};
      if (typeof profile.avatar === 'string') profile.avatar = profile.avatar.replace(/^assets\/avatar\//, '');
      if (!DEFAULT_AVATARS.includes(profile.avatar) && profile.avatar !== 'custom') profile.avatar = randomAvatar();
      if (profile.avatar === 'custom' && !profile.customAvatar) profile.avatar = randomAvatar();
      if (!profile.name) profile.name = 'Super joueur';

      function save() {
         localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      }

      function render() {
         const choices = DEFAULT_AVATARS.map(name => ({ name, src: imageUrl(name) }));
         if (profile.customAvatar) choices.push({ name: 'custom', src: profile.customAvatar });
         const selected = choices.find(choice => choice.name === profile.avatar) || choices[0];
         if (!choices.some(choice => choice.name === profile.avatar)) profile.avatar = selected.name;
         const setImage = (container, alt) => {
            const image = document.createElement('img');
            image.src = selected.src;
            image.alt = alt;
            container.replaceChildren(image);
         };
         setImage(elements.preview, 'Avatar du joueur');
         setImage(elements.homeAvatar, 'Avatar');
         elements.displayName.textContent = profile.name;
         elements.nameInput.value = profile.name;
         elements.grid.replaceChildren();
         choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'avatar-choice' + (choice.name === profile.avatar ? ' active' : '');
            button.setAttribute('aria-label', choice.name === 'custom' ? 'Choisir mon avatar personnel' : `Choisir l’avatar ${index + 1}`);
            button.setAttribute('aria-pressed', String(choice.name === profile.avatar));
            const image = document.createElement('img');
            image.src = choice.src;
            image.alt = '';
            button.append(image);
            button.onclick = () => { profile.avatar = choice.name; save(); render(); };
            elements.grid.append(button);
         });
      }

      elements.uploadButton.onclick = () => elements.fileInput.click();
      elements.fileInput.onchange = async () => {
         const [file] = elements.fileInput.files || [];
         if (!file) return;
         elements.uploadStatus.textContent = 'Préparation de l’image…';
         try {
            profile.customAvatar = await encodeAvatar(file);
            profile.avatar = 'custom';
            save();
            render();
            elements.uploadStatus.textContent = 'Avatar personnel ajouté.';
         } catch (error) {
            elements.uploadStatus.textContent = error.message || 'Impossible d’ajouter cette image.';
         } finally {
            elements.fileInput.value = '';
         }
      };
      elements.saveButton.onclick = () => {
         const name = elements.nameInput.value.trim();
         if (name) profile.name = name.slice(0, 18);
         save();
         render();
         elements.uploadStatus.textContent = 'Profil enregistré.';
      };

      save();
      render();
      return { render, getProfile: () => ({ ...profile }) };
   }

   window.PlayerProfile = { mount, getAvatarOptions: () => [...DEFAULT_AVATARS] };
})();
