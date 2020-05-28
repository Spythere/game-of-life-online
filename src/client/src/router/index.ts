import Vue from "vue";
import VueRouter from "vue-router";
import Game from "../views/Game.vue";

const PAGE_NAME: string = "Game of Life Online"

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "game",
    component: Game,
    meta: {
      title: "Test"
    }
  }
];

const router = new VueRouter({
  routes
});

router.afterEach((to, from) => {
  window.document.title = PAGE_NAME;
})

export default router;
