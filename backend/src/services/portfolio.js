// portfolio.js — Quản lý state portfolio ảo
// Load/save data/portfolio.json
// TODO: implement in logic phase

const INITIAL_STATE = {
  cash: 10000,           // USD ảo ban đầu
  holdings: {
    BTC: 0,
    ETH: 0,
    SOL: 0,
  },
  history: [],           // Mảng quyết định, mỗi item có rootHash từ 0G Storage
  createdAt: new Date().toISOString(),
};

function loadPortfolio() {
  throw new Error('Not yet implemented');
}

function savePortfolio(state) {
  throw new Error('Not yet implemented');
}

function applyDecisions(state, decisions, prices) {
  throw new Error('Not yet implemented');
}

module.exports = { INITIAL_STATE, loadPortfolio, savePortfolio, applyDecisions };
