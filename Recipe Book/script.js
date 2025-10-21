document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const listViewWrapper = document.getElementById('list-view-wrapper');
    const recipeList = document.getElementById('recipe-list');
    const recipeDetailView = document.getElementById('recipe-detail-view');
    const recipeDetailContent = document.getElementById('recipe-detail-content');
    const addRecipeBtn = document.getElementById('addRecipeBtn');
    const recipeModal = document.getElementById('recipeModal');
    const recipeForm = document.getElementById('recipeForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const backToListBtn = document.getElementById('backToListBtn');
    const noRecipes = document.getElementById('no-recipes');
    
    // AI Feature Elements
    const findRecipesBtn = document.getElementById('findRecipesBtn');
    const aiIngredientsInput = document.getElementById('ai-ingredients');
    const aiSuggestionsContainer = document.getElementById('ai-suggestions-container');
    const aiLoader = document.getElementById('ai-loader');
    const aiError = document.getElementById('ai-error');

    // Confirmation Modal Elements
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    // State
    let recipes = [];
    let recipeIdToDelete = null;
    let isFetchingRecipes = false; // Prevents spamming the AI API

    // --- UTILITY & SECURITY FUNCTIONS ---

    /**
     * IMPROVEMENT: XSS Protection
     * Sanitizes a string by converting it to text content, preventing HTML injection.
     */
    const sanitizeHTML = (str) => {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    /**
     * IMPROVEMENT: Robust Local Storage
     * Wraps localStorage access in try-catch blocks to prevent crashes if storage is disabled or full.
     */
    const getRecipesFromStorage = () => {
        try {
            const storedRecipes = localStorage.getItem('recipes');
            return storedRecipes ? JSON.parse(storedRecipes) : [];
        } catch (e) {
            console.error("Failed to read from localStorage", e);
            return []; // Return an empty array on failure
        }
    };

    const saveRecipesToStorage = (recipesToSave) => {
        try {
            localStorage.setItem('recipes', JSON.stringify(recipesToSave));
        } catch (e) {
            console.error("Failed to save to localStorage", e);
            // Optionally, inform the user that recipes could not be saved.
            alert("Could not save recipes. Your browser's storage might be full or disabled.");
        }
    };

    // --- RENDER & VIEW FUNCTIONS ---

    const renderRecipes = () => {
        recipeList.innerHTML = '';
        if (recipes.length === 0) {
            noRecipes.classList.remove('hidden');
            recipeList.classList.add('hidden');
        } else {
            noRecipes.classList.add('hidden');
            recipeList.classList.remove('hidden');
            recipes.forEach(recipe => {
                const recipeCard = document.createElement('div');
                recipeCard.className = 'bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-all duration-300 border hover:shadow-2xl hover:border-blue-500 animate-fade-in';
                
                // Sanitize all user-provided recipe data before injecting
                const safeName = sanitizeHTML(recipe.name);
                const safeImage = recipe.image ? sanitizeHTML(recipe.image) : 'https://placehold.co/600x400/E2E8F0/A0AEC0?text=Recipe';
                const safeIngredients = Array.isArray(recipe.ingredients) ? sanitizeHTML(recipe.ingredients.join(', ')) : sanitizeHTML(recipe.ingredients);

                recipeCard.innerHTML = `
                    <img class="w-full h-48 object-cover" src="${safeImage}" alt="${safeName}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/E2E8F0/A0AEC0?text=Recipe';">
                    <div class="p-6">
                        <h3 class="text-xl font-bold mb-3 text-gray-800 truncate">${safeName}</h3>
                        <p class="text-gray-500 text-sm mb-4 h-10 overflow-hidden">${safeIngredients}</p>
                        <div class="flex justify-end">
                            <button data-id="${recipe.id}" class="view-btn text-blue-600 font-semibold hover:text-blue-800 transition-colors">View Recipe</button>
                        </div>
                    </div>
                `;
                recipeList.appendChild(recipeCard);
            });
        }
    };
    
    const showRecipeDetail = (id) => {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;
        
        // IMPROVEMENT: Handles ingredients as an array for more robust display
        const ingredientsArray = Array.isArray(recipe.ingredients) ? recipe.ingredients : (recipe.ingredients || '').split(',');
        const ingredientsList = ingredientsArray.map(ingredient => `
            <li class="flex items-center text-white mb-2">
                <svg class="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span class="text-white">${sanitizeHTML(ingredient.trim())}</span>
            </li>
        `)
        .join('');
        
        // Sanitize all fields for display
        const safeName = sanitizeHTML(recipe.name);
        const safeImage = recipe.image ? sanitizeHTML(recipe.image) : 'https://placehold.co/600x400/E2E8F0/A0AEC0?text=Recipe';
        const safeInstructions = sanitizeHTML(recipe.instructions).replace(/\n/g, '<br>');

        recipeDetailContent.innerHTML = `
            <div class="lg:grid lg:grid-cols-5 lg:gap-12">
                <div class="lg:col-span-2">
                    <img class="w-full h-auto object-cover rounded-2xl shadow-lg mb-6 lg:mb-0" src="${safeImage}" alt="${safeName}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/E2E8F0/A0AEC0?text=Recipe';">
                </div>
                <div class="lg:col-span-3">
                     <h2 class="text-4xl font-bold mb-4 text-gray-500">${safeName}</h2>
                     <h3 class="text-2xl font-semibold mb-4 border-b pb-3 text-white">Ingredients</h3>
                     <ul class="grid sm:grid-cols-2 gap-x-8 gap-y-2">${ingredientsList}</ul>
                </div>
            </div>
            <div class="mt-8">
                <h3 class="text-2xl font-semibold mb-4 border-b pb-3 text-white">Instructions</h3>
                <p class="text-gray-400 whitespace-pre-wrap leading-relaxed">${safeInstructions}</p>
            </div>
            <div class="mt-10 flex justify-end items-center border-t pt-6 gap-4">
                 <!-- NEW: Edit Button -->
                 <button data-id="${recipe.id}" class="edit-btn bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2">Edit</button>
                 <button data-id="${recipe.id}" class="delete-btn bg-red-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-red-700 transition-all flex items-center gap-2">Delete</button>
            </div>
        `;
        
        listViewWrapper.classList.add('hidden');
        recipeDetailView.classList.remove('hidden');
        window.scrollTo(0, 0);
    };
    
    const showListView = () => {
        recipeDetailView.classList.add('hidden');
        listViewWrapper.classList.remove('hidden');
    };

    const openModal = (modalElement) => modalElement.classList.remove('hidden');
    const closeModal = (modalElement) => modalElement.classList.add('hidden');

    /**
     * NEW: Edit Functionality
     * Opens the recipe form modal and populates it with data from an existing recipe.
     */
    const openEditModal = (id) => {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;

        document.getElementById('recipeId').value = recipe.id;
        document.getElementById('modalTitle').textContent = 'Edit Recipe';
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeImage').value = recipe.image || '';
        const ingredientsText = Array.isArray(recipe.ingredients) ? recipe.ingredients.join(', ') : recipe.ingredients;
        document.getElementById('recipeIngredients').value = ingredientsText;
        document.getElementById('recipeInstructions').value = recipe.instructions;

        openModal(recipeModal);
    };

    /**
     * IMPROVEMENT: Edit & Create Logic, Input Validation
     * Handles both creating a new recipe and updating an existing one.
     */
    const handleFormSubmit = (event) => {
        event.preventDefault();
        
        const recipeId = document.getElementById('recipeId').value;
        const recipeName = document.getElementById('recipeName').value.trim();
        const recipeIngredients = document.getElementById('recipeIngredients').value.trim();
        const recipeInstructions = document.getElementById('recipeInstructions').value.trim();

        // Basic validation
        if (!recipeName || !recipeIngredients || !recipeInstructions) {
            alert("Please fill in the recipe name, ingredients, and instructions.");
            return;
        }

        const recipeData = {
            id: recipeId || Date.now().toString(),
            name: recipeName,
            image: document.getElementById('recipeImage').value.trim(),
            ingredients: recipeIngredients.split(',').map(s => s.trim()).filter(Boolean), // Store as array
            instructions: recipeInstructions,
        };

        if (recipeId) { // If ID exists, it's an update
            const recipeIndex = recipes.findIndex(r => r.id === recipeId);
            if (recipeIndex > -1) {
                recipes[recipeIndex] = recipeData;
            }
        } else { // No ID, it's a new recipe
            recipes.push(recipeData);
        }
        
        saveRecipesToStorage(recipes);
        renderRecipes();
        closeModal(recipeModal);
        if (recipeId) showRecipeDetail(recipeId); // Re-show the detail view after edit
    };
    
    const deleteRecipe = (id) => {
        recipes = recipes.filter(r => r.id !== id);
        saveRecipesToStorage(recipes);
        renderRecipes();
        showListView();
    };

    // --- AI FEATURE FUNCTIONS ---

    const callGeminiAPI = async (ingredients) => {
        if (isFetchingRecipes) return; // Debounce check
        isFetchingRecipes = true;

        aiLoader.classList.remove('hidden');
        aiSuggestionsContainer.innerHTML = '';
        aiError.classList.add('hidden');
        findRecipesBtn.disabled = true;

        const apiKey = ""; 
        
        if (!apiKey) {
            aiError.textContent = `API Key is missing. Please add your key directly into the script.js file.`;
            aiError.classList.remove('hidden');
            aiLoader.classList.add('hidden');
            findRecipesBtn.disabled = false;
            isFetchingRecipes = false;
            return;
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: `Based on these ingredients: ${ingredients}, suggest 3 simple recipes. Provide the response as a valid JSON array of objects. Each object must have three keys: "name" (string), "ingredients" (string, comma-separated), and "instructions" (string).` }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { "name": { "type": "STRING" }, "ingredients": { "type": "STRING" }, "instructions": { "type": "STRING" } }, required: ["name", "ingredients", "instructions"] } } }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error("API Error Body:", errorBody);
                 throw new Error(`API call failed with status: ${response.status}`);
            }
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                displayAiSuggestions(JSON.parse(text));
            } else {
                throw new Error("No content found in API response.");
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            aiError.textContent = `Sorry, we couldn't fetch recipes. The API key might be missing or invalid. Please try again later.`;
            aiError.classList.remove('hidden');
        } finally {
            aiLoader.classList.add('hidden');
            isFetchingRecipes = false; // Re-enable the button
            findRecipesBtn.disabled = false;
        }
    };
    
    /**
     * IMPROVEMENT: Fixes CSS.escape and XSS risk
     * Creates DOM elements programmatically instead of using innerHTML for suggestions.
     */
    const displayAiSuggestions = (suggestedRecipes) => {
        aiSuggestionsContainer.innerHTML = '';
        if (!suggestedRecipes || suggestedRecipes.length === 0) {
            aiSuggestionsContainer.innerHTML = `<p class="text-center text-gray-500">No recipes found for the given ingredients.</p>`;
            return;
        }

        suggestedRecipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in';

            const title = document.createElement('h3');
            title.className = 'text-lg font-bold text-gray-800';
            title.textContent = recipe.name; // Safely sets text

            const ingredientsP = document.createElement('p');
            ingredientsP.className = 'text-sm text-gray-600 mt-2';
            ingredientsP.innerHTML = `<strong>Ingredients:</strong> ${sanitizeHTML(recipe.ingredients)}`;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'text-right mt-4';

            const saveButton = document.createElement('button');
            saveButton.className = 'save-ai-recipe-btn bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-all';
            saveButton.textContent = 'Save to my Book';
            // Use dataset to store data safely
            saveButton.dataset.name = recipe.name;
            saveButton.dataset.ingredients = recipe.ingredients;
            saveButton.dataset.instructions = recipe.instructions;

            buttonContainer.appendChild(saveButton);
            card.append(title, ingredientsP, buttonContainer);
            aiSuggestionsContainer.appendChild(card);
        });
    };

    const saveAiRecipe = (button) => {
        const { name, ingredients, instructions } = button.dataset;
        const newRecipe = { 
            id: Date.now().toString(), 
            name, 
            image: '', 
            ingredients: ingredients.split(',').map(s => s.trim()).filter(Boolean), // Save as array
            instructions 
        };
        recipes.push(newRecipe);
        saveRecipesToStorage(recipes);
        renderRecipes();
        button.textContent = 'Saved!';
        button.disabled = true;
        button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        button.classList.add('bg-green-500', 'cursor-not-allowed');
    };

    // --- EVENT LISTENERS ---

    addRecipeBtn.addEventListener('click', () => {
        recipeForm.reset();
        document.getElementById('recipeId').value = '';
        document.getElementById('modalTitle').textContent = 'Add a New Recipe';
        openModal(recipeModal);
    });
    cancelBtn.addEventListener('click', () => closeModal(recipeModal));
    recipeForm.addEventListener('submit', handleFormSubmit);
    backToListBtn.addEventListener('click', showListView);

    findRecipesBtn.addEventListener('click', () => {
        const ingredients = aiIngredientsInput.value.trim();
        if (ingredients) {
            callGeminiAPI(ingredients);
        } else {
            aiError.textContent = 'Please enter some ingredients.';
            aiError.classList.remove('hidden');
        }
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (recipeIdToDelete) deleteRecipe(recipeIdToDelete);
        closeModal(confirmationModal);
        recipeIdToDelete = null;
    });

    cancelDeleteBtn.addEventListener('click', () => closeModal(confirmationModal));
    
    // Main event delegation for dynamically created buttons
    document.body.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const editBtn = e.target.closest('.edit-btn');
        const saveAiBtn = e.target.closest('.save-ai-recipe-btn');

        if (viewBtn) showRecipeDetail(viewBtn.dataset.id);
        if (editBtn) openEditModal(editBtn.dataset.id);
        if (saveAiBtn) saveAiRecipe(saveAiBtn);

        if (deleteBtn) {
            recipeIdToDelete = deleteBtn.dataset.id;
            openModal(confirmationModal);
        }
    });

    [recipeModal, confirmationModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // --- INITIALIZATION ---
    recipes = getRecipesFromStorage();
    renderRecipes();
});



