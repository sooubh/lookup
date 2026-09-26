export const isDev = process.env.__DEV__ === 'true';
export const isProduction = !isDev;

export const watchOption = isDev ? {
  buildDelay: 100,
  chokidar: {
    ignored: [
      /\/packages\/.*\.(ts|tsx|map)$/,
    ]
  }
} : undefined;
