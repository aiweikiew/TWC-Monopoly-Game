"use strict";

(function(){
  function initBoardReview(){
    if(typeof renderGame !== "function" || typeof navigateBack !== "function") return;
    if(document.documentElement.dataset.boardReviewV3 === "true") return;
    document.documentElement.dataset.boardReviewV3 = "true";

    if(!document.querySelector('link[href="css/board-v3.css"]')){
      const styles = document.createElement("link");
      styles.rel = "stylesheet";
      styles.href = "css/board-v3.css";
      document.head.appendChild(styles);
    }

    const originalRenderGame = renderGame;
    const originalCanNavigateBack = canNavigateBack;
    const originalNavigateBack = navigateBack;

    function canReviewIdentitiesFromBoard(){
      return gameState.mode === "monopoly" &&
        gameState.phase === "starting" &&
        navigationState.currentView?.type === "board" &&
        ["ready","resolved"].includes(gameState.board.status) &&
        !navigationBusy();
    }

    function resetSetupReviewControls(){
      const draw = document.getElementById("setupDrawBtn");
      const undo = document.getElementById("setupUndoBtn");
      const reset = document.getElementById("setupResetBtn");
      const confirm = document.getElementById("setupConfirmBtn");
      if(draw) draw.hidden = false;
      if(undo) undo.hidden = false;
      if(reset) reset.hidden = false;
      if(confirm){
        confirm.hidden = false;
        confirm.textContent = "Confirm Identities & Start Game";
      }
    }

    function renderIdentityReview(){
      const setup = document.getElementById("setupScreen");
      const monopoly = document.getElementById("monopolyScreen");
      const game = document.getElementById("gameScreen");
      const shock = document.getElementById("industrialShockScreen");
      const globalBack = document.getElementById("backBtn");
      const landingBack = document.getElementById("landingReturnBtn");

      if(typeof hideBoardOverlays === "function") hideBoardOverlays();
      if(monopoly) monopoly.hidden = true;
      if(game) game.hidden = true;
      if(shock) shock.hidden = true;
      if(setup) setup.classList.remove("hidden");
      if(globalBack) globalBack.hidden = true;
      if(landingBack) landingBack.hidden = true;
      document.body.classList.remove("has-back");

      renderSetupCards();
      renderSetupSelection();
      if(typeof decorateSetupTeamBadges === "function") decorateSetupTeamBadges();

      const banner = document.getElementById("setupBanner");
      const draw = document.getElementById("setupDrawBtn");
      const undo = document.getElementById("setupUndoBtn");
      const reset = document.getElementById("setupResetBtn");
      const confirm = document.getElementById("setupConfirmBtn");
      const status = document.getElementById("setupStatus");

      if(banner) banner.textContent = "Identities confirmed — your current game progress is saved.";
      if(draw) draw.hidden = true;
      if(undo) undo.hidden = true;
      if(reset) reset.hidden = true;
      if(status) status.hidden = true;
      if(confirm){
        confirm.hidden = false;
        confirm.disabled = false;
        confirm.textContent = "Return to Grand Tour";
      }
    }

    canNavigateBack = function(){
      if(canReviewIdentitiesFromBoard()) return true;
      return originalCanNavigateBack();
    };

    navigateBack = function(){
      if(canReviewIdentitiesFromBoard()){
        navigationState.selection = null;
        navigationState.currentView = makeView("identity-review");
        return true;
      }
      return originalNavigateBack();
    };

    renderGame = function(){
      syncNavigation();
      if(navigationState.currentView?.type === "identity-review" && isCurrentView()){
        saveGameState();
        renderIdentityReview();
        return;
      }

      originalRenderGame();

      if(gameState.phase === "setup") resetSetupReviewControls();

      const back = document.getElementById("backBtn");
      if(back && canReviewIdentitiesFromBoard()){
        back.hidden = false;
        back.disabled = false;
        back.textContent = "← Back";
        document.body.classList.add("has-back");
      }
    };

    const confirm = document.getElementById("setupConfirmBtn");
    if(confirm && !confirm.dataset.identityReviewReturn){
      confirm.dataset.identityReviewReturn = "true";
      confirm.addEventListener("click", event => {
        if(navigationState.currentView?.type !== "identity-review") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        resumeCurrentGame();
        renderGame();
      }, true);
    }

    renderGame();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",initBoardReview,{once:true});
  else initBoardReview();
})();
