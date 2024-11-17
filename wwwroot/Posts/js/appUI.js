const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let currentETag = "";
let searchBarInput = "";
let hold_Periodic_Refresh = false;
let pageManager;
let itemLayout;
const days = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const months = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

let waiting = null;
let waitingGifTrigger = 2000;
function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    $("#itemsPanel").append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}
function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

Init_UI();

async function Init_UI() {
  itemLayout = {
    width: $("#sample").outerWidth(),
    height: $("#sample").outerHeight(),
  };
  pageManager = new PageManager(
    "scrollPanel",
    "itemsPanel",
    itemLayout,
    renderPosts
  );
  compileCategories();
  $("#createPost").on("click", async function () {
    renderCreatePostForm();
  });
  $("#searchPost").on("click", async function () {
    flipSearch();
  });
  $("#abort").on("click", async function () {
    showPosts();
  });
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  $("#searchInput").on("keydown", async function (event) {
    if (event.key === "Enter") {
      searchBarInput = $("#searchInput").val();
      pageManager.reset();
    }
  });
  showPosts();
  flipSearch();
  start_Periodic_Refresh();
}

function flipSearch() {
  if ($("#search").is(":visible")) {
    $("#search").hide();
  } else {
    $("#search").show();
  }
}
function showPosts() {
  $("#actionTitle").text("Liste des publications");
  $("#scrollPanel").show();
  $("#abort").hide();
  $("#postForm").hide();
  $("#aboutContainer").hide();
  $("#createPost").show();
  hold_Periodic_Refresh = false;
}
function hidePosts() {
  $("#searchPost").hide();
  $("#scrollPanel").hide();
  $("#createPost").hide();
  $("#abort").show();
  hold_Periodic_Refresh = true;
}
function start_Periodic_Refresh() {
  setInterval(async () => {
    if (!hold_Periodic_Refresh) {
      let etag = await Posts_API.HEAD();
      if (currentETag != etag) {
        currentETag = etag;
        await pageManager.update(false);
        compileCategories();
      }
    }
  }, periodicRefreshPeriod * 1000);
}
function renderAbout() {
  hidePosts();
  $("#actionTitle").text("À propos...");
  $("#aboutContainer").show();
}
function updateDropDownMenu() {
  let DDMenu = $("#DDMenu");
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );
  $("#aboutCmd").on("click", function () {
    renderAbout();
  });
  $("#allCatCmd").on("click", function () {
    showPosts();
    selectedCategory = "";
    updateDropDownMenu();
    pageManager.reset();
  });
  $(".category").on("click", function () {
    showPosts();
    selectedCategory = $(this).text().trim();
    updateDropDownMenu();
    pageManager.reset();
  });
}
async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?fields=category&sort=category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      updateDropDownMenu(categories);
    }
  }
}
async function renderPosts(queryString) {
  let endOfData = false;
  queryString += "&sort=category";
  if (searchBarInput != "") queryString += "&keywords=" + searchBarInput;
  if (selectedCategory != "") queryString += "&category=" + selectedCategory;
  addWaitingGif();
  let response = await Posts_API.Get(queryString);
  if (!Posts_API.error) {
    currentETag = response.ETag;
    let Posts = response.data;
    if (Posts.length > 0) {
      Posts.forEach((Post) => {
        $("#itemsPanel").append(renderPost(Post));
      });
      $(".editCmd").off();
      $(".editCmd").on("click", function () {
        renderEditPostForm($(this).attr("editPostId"));
      });
      $(".deleteCmd").off();
      $(".deleteCmd").on("click", function () {
        renderDeletePostForm($(this).attr("deletePostId"));
      });
    } else endOfData = true;
  } else {
    renderError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
  postsCut();
  return endOfData;
}

function renderError(message) {
  hidePosts();
  $("#actionTitle").text("Erreur du serveur...");
  $("#errorContainer").show();
  $("#errorContainer").append($(`<div>${message}</div>`));
}
function renderCreatePostForm() {
  renderPostForm();
}
async function renderEditPostForm(id) {
  addWaitingGif();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) renderPostForm(Post);
    else renderError("Post introuvable!");
  } else {
    renderError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
  
}
async function renderDeletePostForm(id) {
  hidePosts();
  $("#actionTitle").text("Retrait");
  $("#postForm").show();
  $("#postForm").empty();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) {
      $("#postForm").append(`
        <div class="PostdeleteForm">
            <h4>Effacer le favori suivant?</h4>
            <br>
            <div class="PostRow" id=${Post.Id}">
                <div class="PostContainer noselect">
                    <div class="PostLayout">
                    <span class="PostCategory">${Post.Category}</span>
                        <div class="Post">
                            <span class="PostTitle">${Post.Title}</span>
                        </div>
                                            <div class="PostImageContainer">
                        <img src="${Post.Image}" alt="Image de la publication" class="PostImage" />
                    </div>
                    </div>
                </div>
            </div>   
            <br>
            <div class="deleteConfirmContainer">
                <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
            </div>
        </div>    
        `);
      $("#deletePost").on("click", async function () {
        await Posts_API.Delete(Post.Id);
        if (!Posts_API.error) {
          showPosts();
          await pageManager.update(false);
          compileCategories();
        } else {
          console.log(Posts_API.currentHttpError);
          renderError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", function () {
        showPosts();
      });
    } else {
      renderError("Post introuvable!");
    }
  } else renderError(Posts_API.currentHttpError);
}
function getFormData($form) {
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  return jsonObject;
}
function newPost() {
  Post = {};
  Post.Id = 0;
  Post.Title = "";
  Post.Text = "";
  Post.Category = "";
  Post.Image = "";
  Post.Creation = 0;
  return Post;
}
function renderPostForm(Post = null) {
  hidePosts();
  let create = Post == null;
  if (create) Post = newPost();
  else $("#actionTitle").text(create ? "Création" : "Modification");
  $("#postForm").show();
  $("#postForm").empty();
  $("#postForm").append(`
        <form class="form" id="PostForm">
            <input type="hidden" name="Id" value="${Post.Id}"/>
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control Alpha"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Post.Title}"
            />
            <label for="Text" class="form-label">Text </label>
            <textarea
            class="form-control Text"
            name="Text"
            id="Text"
            placeholder="Text"
            required
            >${Post.Text}</textarea>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Post.Category}"
            />
            <br>
            <label for="Image" class="form-label">Image </label>
            <label class="form-label">Avatar </label>
            <div 
            class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Post.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <hr>
            <input
            type="hidden"
            id="creationTime"
            name="Creation"
            value="${Date.now()}"
            />
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
  initImageUploaders();
  initFormValidation();
  $("#PostForm").on("submit", async function (event) {
    event.preventDefault();

    let Post = getFormData($("#PostForm"));
    Post = await Posts_API.Save(Post, create);
    if (!Posts_API.error) {
      showPosts();
      await pageManager.update(false);
      compileCategories();
      pageManager.scrollToElem(Post.Id);
      console.log("Post enregistré");
    } else renderError("Une erreur est survenue!");
  });
  $("#cancel").on("click", function () {
    showPosts();
  });
}
function renderPost(Post) {
  Post.Creation = frenchyfyDate(Post.Creation);
  Post.Category = Post.Category.toUpperCase();
  Post.Text = respectSkipLines(Post.Text);

  return $(`
        <div class="PostRow" id='${Post.Id}'>
            <div class="PostContainer noselect">
                <div class="PostLayout">
                    <div class="PostCommandPanel">
                        <span class="PostCategory">${Post.Category}</span>
                        <span class="editCmd cmdIcon fa fa-pencil" editPostId="${Post.Id}" title="Modifier ${Post.Title}"></span>
                        <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${Post.Id}" title="Effacer ${Post.Title}"></span>
                    </div>
                    <div class="Post">
                        <span class="PostTitle">${Post.Title}</span>
                    </div>
                    <div class="PostImageContainer">
                        <img src="${Post.Image}" alt="Image de la publication" class="PostImage" />
                    </div>
                    <p class="PostDate">${Post.Creation}</p>
                    <div class="PostText">
                        <p class="text">${Post.Text}</p>
                    </div>
                    <button class="read-more-btn">Lire ...</button>
                </div>
            </div>
        </div>
    `);
}
function frenchyfyDate(date) {
  let d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${days[d.getDay()]} ${d.getDate()} ${
    months[d.getMonth()]
  } ${d.getFullYear()} - ${hours}:${minutes}:${seconds}`;
}
function respectSkipLines(text) {
  return text.replace(/\n/g, "<br>");
}
function postsCut() {
$(".PostRow").each(function () {
    const textPostCtn = $(this).find(".PostText");
    const text = $(this).find(".text");
    const button = $(this).find(".read-more-btn");
    const originalText = text.text().trim();
  if (originalText.length > 500) {
    const truncatedText = originalText.slice(0, 500) + "...";
    text.text(truncatedText);

    button.on("click", function () {
        const truncatedText = originalText.slice(0, 500) + "...";
      if (textPostCtn.hasClass("expanded")) {
        text.text(truncatedText);
        textPostCtn.removeClass("expanded");
        $(this).text("Lire ...");
      } else {
        text.text(originalText);
        textPostCtn.addClass("expanded");
        $(this).text("Réduire");
      }
    });
  } else {
    button.hide();
  }
});
}
