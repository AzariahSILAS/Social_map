social-map
|---------/app
        |---------favicon.ico
        |---------global.css
        |---------layout.tsx
        |---------page.tsx

|---------/components
        |---------/ui
                |---------input.tsx
                |---------utils.ts
        |---------Camera.tsx
        |---------Map.tsx
        |---------PhotoViewer.tsx
        |---------Search.tsx
|---------/public
|--------/supabase
        |---------/functions
                 |---------/server
                           |---------index.tsx
|--------/utils
        |---------/supabase
                  |---------client.ts
                  |---------info.tsx
|....

A bug that needs to be fixed is the when i try to add a photo to the map when im not logged in it gets stuck on the loading screen and the it makes the log in button stuck as well if i refresh the screen.