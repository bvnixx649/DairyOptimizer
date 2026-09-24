// Builds and publishes dist/ to the gh-pages branch (GitHub Pages serves that branch).
// Uses a throwaway index so the working tree and main branch are untouched.
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const sh = (cmd, env = {}) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env } }).toString().trim()

execSync('npm test && npm run build', { stdio: 'inherit' })
const index = '.git/deploy-index'
rmSync(index, { force: true })
const env = { GIT_INDEX_FILE: index }
sh('git --work-tree=dist add -A .', env)
const tree = sh('git write-tree', env)
const head = sh('git rev-parse --short HEAD')
const commit = sh(`git commit-tree ${tree} -m "Deploy ${head}"`)
rmSync(index, { force: true })
execSync(`git push -f origin ${commit}:refs/heads/gh-pages`, { stdio: 'inherit' })
console.log(`Deployed ${head} → https://bvnixx649.github.io/DairyOptimizer/`)
