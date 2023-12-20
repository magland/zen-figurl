import { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'

export default (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'GET') {
        res.status(400).send('Invalid method')
        return
    }
    const { siteUri, kacheryZone } = req.query
    if (!siteUri) {
        res.status(400).send('Missing siteUri')
        return
    }

    (async () => {
        // trigger github workflow to prepare site
        const githubToken = process.env.GITHUB_API_TOKEN
        if (!githubToken) {
            res.status(400).send('Missing github token')
            return
        }
        const repoOrg = 'magland'
        const repoName = 'zen-figurl'
        const branch = 'main'
        const workflowName = 'prepare-site.yml'
        const workflowInput = {
            siteUri,
            kacheryZone
        }
        const url = `https://api.github.com/repos/${repoOrg}/${repoName}/actions/workflows/${workflowName}/dispatches`

        const data = {
            ref: branch,
            inputs: workflowInput
        }

        const headers = {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }

        const response = await axios.post(url, data, { headers })
        if (response.status !== 204) {
            res.status(500).send(`Error triggering workflow: ${response.data}`)
            return
        }
        res.status(200).send({success: true})
    })().catch(err => {
        console.error(err)
        res.status(500).send(`Error: ${err.message}`)
    })
}