const original = require('./app.json').expo;

module.exports = ({ config }) => {
  const qaBuild = process.env.NORRIS_QA_BUILD === '1';
  if (!qaBuild) return { ...config, ...original };
  if (process.env.EXPO_PUBLIC_API_URL !== 'http://10.0.2.2:8000/api/v1') {
    throw new Error('QA emulator build must use the runner-local API endpoint');
  }
  return {
    ...config,
    ...original,
    name: 'NorrisBeauty QA',
    plugins: [...original.plugins, './plugins/withQaCleartext'],
  };
};
