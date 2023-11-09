import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import fs from 'node:fs';
import {promisify} from 'node:util';
import * as fsExtra from "fs-extra";

const fetchURL = async (url) => {
    const response = await fetch(url);
    const data = await response.text();
    const {total, results} = JSON.parse(data)
    for (const it of results) {
        const title = it.url.split("/").pop();

        const html = await fetch(it.url);
        const data = await html.text();
        const root = parse(data);
        const text = root.querySelector('.kb-article').textContent;

        const writeFile = promisify(fs.writeFile);
        await writeFile(`./hubspot-documents/${title}.txt`, text);
    }

    return total;
}

export const createDocs = async () => {
    const url = 'https://api.hubapi.com/contentsearch/v2/search?portalId=4870528&type=KNOWLEDGE_ARTICLE&term=a_b_c_d_e_f_g_h_i_j_k_l_m_n_o_p_q_r_s_t_u_v_w_x_y_z&limit=10';
    let offset = 0;
    const total = await fetchURL(`${url}&offset=${offset}`);

    for (let i=10; i<= total; i+=10) {
        await fetchURL(`${url}&offset=${i}`)
    }
}

export const deleteDocs = async fileDir => {
    fsExtra.emptyDirSync(fileDir);
}