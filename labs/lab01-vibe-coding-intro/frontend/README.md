# URL Shortener Frontend

A modern, responsive Next.js application for shortening URLs with a beautiful gradient UI and dark mode support. Built with TypeScript and Tailwind CSS.

## Features

- **Clean Interface**: Intuitive single-page design for URL shortening
- **Real-time Validation**: Client-side URL validation before submission
- **One-Click Copy**: Copy shortened URLs to clipboard with visual feedback
- **Error Handling**: User-friendly error messages for invalid URLs or API failures
- **Dark Mode Support**: Automatic theme detection and styling
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Loading States**: Visual feedback during API requests

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Hooks**: Modern state management

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn package manager

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Configure environment variables**:
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and set your backend API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

## Running Locally

**Development mode** (with hot reload):
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

**Production build**:
```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | `http://localhost:8000` |

> **Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main URL shortener page
│   └── globals.css      # Global styles and Tailwind directives
├── public/              # Static assets
├── .env.local           # Environment variables (not in git)
├── .env.local.example   # Environment template
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Usage

1. **Enter a URL**: Type or paste a long URL into the input field
2. **Shorten**: Click the "Shorten URL" button or press Enter
3. **Copy**: Click the copy button to copy the shortened URL to clipboard
4. **Reset**: Use the "Shorten Another" button to create a new short URL

## UI Components

### Main Features

- **Gradient Background**: Beautiful blue-to-indigo gradient with dark mode variant
- **Input Validation**: Real-time feedback for empty or invalid URLs
- **Loading Spinner**: Animated feedback during API calls
- **Success State**: Displays shortened URL with copy functionality
- **Error Messages**: Clear error communication with retry options

### Color Scheme

- **Light Mode**: Blue-50 to Indigo-100 gradient
- **Dark Mode**: Gray-900 to Gray-800 gradient
- **Accent**: Blue-600 for buttons and interactive elements

## Customization

### Styling

Modify Tailwind configuration in [tailwind.config.ts](tailwind.config.ts):
```typescript
export default {
  theme: {
    extend: {
      // Add custom colors, fonts, or spacing
    },
  },
}
```

### API Integration

The API URL can be changed via environment variables or modified in [app/page.tsx](app/page.tsx):
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub/GitLab/Bitbucket
2. Import project to Vercel
3. Set `NEXT_PUBLIC_API_URL` environment variable
4. Deploy!

### Other Platforms

Build the production bundle:
```bash
npm run build
```

The output will be in `.next/` directory. Deploy using:
- **Netlify**: Use `next start` command
- **Railway**: Configure with Node.js buildpack
- **AWS Amplify**: Follow Next.js deployment guide
- **Docker**: See containerization section below

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t url-shortener-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api.example.com url-shortener-frontend
```

## Development Tips

### Type Safety

All API responses are typed:
```typescript
interface ShortenResponse {
  short_code: string
  short_url: string
}
```

### State Management

The component uses React hooks:
- `useState` for URL input, loading states, results, and errors
- Form submission is handled via `handleSubmit`
- Clipboard API used for copy functionality

### Error Handling

Errors are caught and displayed to users with helpful messages:
- Invalid URL format
- Network errors
- API failures
- Clipboard access issues

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML elements
- Keyboard navigation support
- ARIA labels for interactive elements
- Color contrast meets WCAG AA standards

## Performance

- Server-side rendering with Next.js
- Automatic code splitting
- Image optimization (if images are added)
- CSS purging via Tailwind in production

## Troubleshooting

### CORS Errors
Ensure backend CORS is configured to allow your frontend origin.

### API Connection Issues
Verify `NEXT_PUBLIC_API_URL` is set correctly and backend is running.

### Build Errors
Clear `.next` directory and node_modules, then reinstall:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Contributing

When adding features, follow these patterns:
- Keep components in `app/` directory
- Use TypeScript for type safety
- Follow existing Tailwind utility patterns
- Add proper error handling
- Test on multiple screen sizes

## License

This project is part of the Agentic Training course materials.
